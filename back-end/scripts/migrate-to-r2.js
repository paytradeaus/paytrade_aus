const {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME || 'paytrade';

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.log('[R2-MIGRATE] R2 credentials not set, skipping migration.');
  process.exit(0);
}

let replitClient = null;
try {
  const { Client } = require('@replit/object-storage');
  replitClient = new Client();
} catch {
  console.log('[R2-MIGRATE] @replit/object-storage not available, skipping migration.');
  process.exit(0);
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

const stats = { total: 0, uploaded: 0, skipped: 0, failed: 0 };

async function fileExistsInR2(key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

function getMimeType(key) {
  const ext = key.split('.').pop()?.toLowerCase() || '';
  const types = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    pdf: 'application/pdf', csv: 'text/csv', txt: 'text/plain',
    log: 'text/plain', sql: 'application/sql', json: 'application/json',
    xml: 'application/xml', zip: 'application/zip', aba: 'text/plain',
    html: 'text/html',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return types[ext] || 'application/octet-stream';
}

async function migrateFile(key) {
  try {
    if (await fileExistsInR2(key)) {
      stats.skipped++;
      return;
    }

    const result = await replitClient.downloadAsBytes(key);
    if (!result.ok) {
      stats.failed++;
      return;
    }

    let buffer;
    const value = result.value;
    if (Buffer.isBuffer(value)) {
      buffer = value;
    } else if (Array.isArray(value) && value.length > 0 && Buffer.isBuffer(value[0])) {
      buffer = value[0];
    } else {
      buffer = Buffer.from(value);
    }

    await r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: getMimeType(key),
      }),
    );

    stats.uploaded++;
    console.log(`[R2-MIGRATE]   copied: ${key} (${(buffer.length / 1024).toFixed(1)} KB)`);
  } catch (error) {
    stats.failed++;
    console.error(`[R2-MIGRATE]   FAILED: ${key}: ${error.message}`);
  }
}

async function main() {
  console.log('[R2-MIGRATE] Starting Replit → R2 file migration...');
  console.log(`[R2-MIGRATE] Target bucket: ${bucket}`);

  const listResult = await replitClient.list({});
  if (!listResult.ok) {
    console.error('[R2-MIGRATE] Failed to list Replit files:', listResult.error);
    process.exit(0);
  }

  const allFiles = listResult.value.map((obj) => obj.name);
  stats.total = allFiles.length;

  if (stats.total === 0) {
    console.log('[R2-MIGRATE] No files in Replit Object Storage. Done.');
    process.exit(0);
  }

  console.log(`[R2-MIGRATE] Found ${stats.total} files to check...`);

  const CONCURRENCY = 5;
  for (let i = 0; i < allFiles.length; i += CONCURRENCY) {
    const batch = allFiles.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map((key) => migrateFile(key)));
  }

  console.log('[R2-MIGRATE] === Migration Complete ===');
  console.log(`[R2-MIGRATE] Total: ${stats.total} | Uploaded: ${stats.uploaded} | Skipped: ${stats.skipped} (already in R2) | Failed: ${stats.failed}`);
}

main().catch((err) => {
  console.error('[R2-MIGRATE] Migration error (non-fatal):', err.message);
  process.exit(0);
});
