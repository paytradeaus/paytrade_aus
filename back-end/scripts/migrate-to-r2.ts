import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME || 'paytrade';

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error('Missing R2 credentials. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
  process.exit(1);
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

let replitClient: any = null;
try {
  const { Client } = require('@replit/object-storage');
  replitClient = new Client();
} catch {
  console.error('Cannot load @replit/object-storage — run this on Replit where the package is available.');
  process.exit(1);
}

interface MigrationStats {
  total: number;
  uploaded: number;
  skipped: number;
  failed: number;
  errors: string[];
}

async function fileExistsInR2(key: string): Promise<boolean> {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function migrateFile(key: string, stats: MigrationStats): Promise<void> {
  try {
    const exists = await fileExistsInR2(key);
    if (exists) {
      stats.skipped++;
      return;
    }

    const result = await replitClient.downloadAsBytes(key);
    if (!result.ok) {
      stats.failed++;
      stats.errors.push(`Download failed: ${key}`);
      return;
    }

    let buffer: Buffer;
    const value = result.value;
    if (Buffer.isBuffer(value)) {
      buffer = value;
    } else if (Array.isArray(value) && value.length > 0 && Buffer.isBuffer(value[0])) {
      buffer = value[0];
    } else {
      buffer = Buffer.from(value as unknown as Uint8Array);
    }

    const ext = key.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
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
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    await r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    stats.uploaded++;
    console.log(`  ✓ ${key} (${(buffer.length / 1024).toFixed(1)} KB)`);
  } catch (error: any) {
    stats.failed++;
    stats.errors.push(`${key}: ${error.message}`);
    console.error(`  ✗ ${key}: ${error.message}`);
  }
}

async function main() {
  console.log('=== Replit Object Storage → Cloudflare R2 Migration ===');
  console.log(`Target bucket: ${bucket}`);
  console.log('');

  const stats: MigrationStats = { total: 0, uploaded: 0, skipped: 0, failed: 0, errors: [] };

  const listResult = await replitClient.list({});
  if (!listResult.ok) {
    console.error('Failed to list Replit Object Storage files:', listResult.error);
    process.exit(1);
  }

  const allFiles: string[] = listResult.value.map((obj: any) => obj.name);
  stats.total = allFiles.length;

  console.log(`Found ${stats.total} files in Replit Object Storage`);
  console.log('');

  const CONCURRENCY = 5;
  for (let i = 0; i < allFiles.length; i += CONCURRENCY) {
    const batch = allFiles.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map((key) => migrateFile(key, stats)));

    if ((i + CONCURRENCY) % 50 === 0 || i + CONCURRENCY >= allFiles.length) {
      console.log(`  Progress: ${Math.min(i + CONCURRENCY, allFiles.length)}/${stats.total}`);
    }
  }

  console.log('');
  console.log('=== Migration Complete ===');
  console.log(`Total files:  ${stats.total}`);
  console.log(`Uploaded:     ${stats.uploaded}`);
  console.log(`Skipped:      ${stats.skipped} (already in R2)`);
  console.log(`Failed:       ${stats.failed}`);

  if (stats.errors.length > 0) {
    console.log('');
    console.log('Errors:');
    for (const err of stats.errors) {
      console.log(`  - ${err}`);
    }
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
