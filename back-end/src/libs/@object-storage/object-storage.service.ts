import { Injectable } from '@nestjs/common';
import { PaytradeLogger } from '../@loggers/logger.service';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

let replitFallbackClient: any = null;
let replitFallbackAttempted = false;

function getReplitClient(): any {
  if (replitFallbackAttempted) return replitFallbackClient;
  replitFallbackAttempted = true;
  try {
    const { Client } = require('@replit/object-storage');
    replitFallbackClient = new Client();
  } catch {
    replitFallbackClient = null;
  }
  return replitFallbackClient;
}

@Injectable()
export class ObjectStorageService {
  private r2: S3Client;
  private logger: PaytradeLogger;
  private bucket: string;

  constructor() {
    this.logger = new PaytradeLogger('OBJECT_STORAGE_SERVICE');
    this.bucket = process.env.R2_BUCKET_NAME || 'paytrade';

    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      this.logger.warn(
        'R2 credentials not fully configured. Falling back to Replit Object Storage.',
      );
    }

    this.r2 = new S3Client({
      region: 'auto',
      endpoint: accountId
        ? `https://${accountId}.r2.cloudflarestorage.com`
        : undefined,
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });
  }

  private isR2Configured(): boolean {
    return !!(
      process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY
    );
  }

  private getObjectPath(attachmentType: string, filename: string): string {
    let baseDir = '';
    switch (attachmentType) {
      case 'User_profile':
        baseDir = 'profile_photo';
        break;
      case 'Admin_profile':
        baseDir = 'admin_profile_photo';
        break;
      case 'Company_logo':
        baseDir = 'company_logo';
        break;
      case 'Communication_attach':
        baseDir = 'communication';
        break;
      case 'Trust_Training_Records':
        baseDir = 'trust_training_records';
        break;
      case 'Blog_banner':
        baseDir = 'blog_banner';
        break;
      case 'Resource_attachments':
        baseDir = 'resources';
        break;
      case 'Notices_templates':
        baseDir = 'notice-templates';
        break;
      case 'Notices_uploads':
        baseDir = 'notices';
        break;
      case 'Recieved_notices_uploads':
        baseDir = 'recieved-notices';
        break;
      case 'Notices_supporting_docs':
        baseDir = 'notices_supporting_docs';
        break;
      case 'Contracts':
        baseDir = 'contracts';
        break;
      case 'Variations':
        baseDir = 'variations';
        break;
      case 'Bank_statements':
        baseDir = 'bank_statements';
        break;
      case 'Retention_trust_certificates':
        baseDir = 'retention_trust_certificates';
        break;
      case 'Transaction_csv_file_attachments':
        baseDir = 'transaction_csv_file_attachments';
        break;
      case 'Optional_attachments':
        baseDir = 'optional_attachments';
        break;
      case 'Compulsory_attachments':
        baseDir = 'compulsory_attachments';
        break;
      case 'Optional_supporting_statement_attachments':
        baseDir = 'optional_supporting_statement_attachments';
        break;
      case 'Audit':
        baseDir = 'audit_reports';
        break;
      case 'Aba_file_upload':
        baseDir = 'generated_aba_files';
        break;
      case 'Admin_holiday':
        baseDir = 'Admin_holiday';
        break;
      case 'Content_image':
        baseDir = 'content_images';
        break;
      default:
        baseDir = 'misc';
    }
    return `${baseDir}/${filename}`;
  }

  private getMimeType(objectPath: string): string {
    const ext = objectPath.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      csv: 'text/csv',
      txt: 'text/plain',
      log: 'text/plain',
      sql: 'application/sql',
      json: 'application/json',
      xml: 'application/xml',
      zip: 'application/zip',
      aba: 'text/plain',
      html: 'text/html',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  async uploadFile(
    fileBuffer: Buffer,
    attachmentType: string,
    filename: string,
    contentType?: string,
  ): Promise<{ objectPath: string; success: boolean }> {
    const objectPath = this.getObjectPath(attachmentType, filename);

    try {
      this.logger.log(`Uploading file to R2: ${objectPath}`);

      if (this.isR2Configured()) {
        await this.r2.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: objectPath,
            Body: fileBuffer,
            ContentType: contentType || this.getMimeType(objectPath),
          }),
        );
        this.logger.log(`File uploaded to R2 successfully: ${objectPath}`);
        return { objectPath, success: true };
      }

      const replit = getReplitClient();
      if (replit) {
        const result = await replit.uploadFromBytes(objectPath, fileBuffer);
        if (result.ok) {
          this.logger.log(`File uploaded to Replit fallback: ${objectPath}`);
          return { objectPath, success: true };
        }
        this.logger.error(`Replit fallback upload failed: ${result.error}`);
        return { objectPath: '', success: false };
      }

      throw new Error('No storage backend configured');
    } catch (error) {
      this.logger.error(`Error uploading file: ${error.message}`);
      throw error;
    }
  }

  async uploadFileDirect(
    objectPath: string,
    fileBuffer: Buffer,
    contentType?: string,
  ): Promise<boolean> {
    try {
      const normalizedPath = this.normalizeObjectPath(objectPath);
      this.logger.log(`Uploading file directly: ${normalizedPath}`);

      if (this.isR2Configured()) {
        await this.r2.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: normalizedPath,
            Body: fileBuffer,
            ContentType: contentType || this.getMimeType(normalizedPath),
          }),
        );
        this.logger.log(`File uploaded to R2 successfully: ${normalizedPath}`);
        return true;
      }

      const replit = getReplitClient();
      if (replit) {
        const result = await replit.uploadFromBytes(normalizedPath, fileBuffer);
        if (result.ok) {
          return true;
        }
        this.logger.error(`Replit fallback upload failed: ${result.error}`);
        return false;
      }

      throw new Error('No storage backend configured');
    } catch (error) {
      this.logger.error(`Error uploading file directly: ${error.message}`);
      return false;
    }
  }

  async uploadFromText(
    content: string,
    attachmentType: string,
    filename: string,
  ): Promise<{ objectPath: string; success: boolean }> {
    const objectPath = this.getObjectPath(attachmentType, filename);

    try {
      this.logger.log(`Uploading text content: ${objectPath}`);

      if (this.isR2Configured()) {
        await this.r2.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: objectPath,
            Body: Buffer.from(content, 'utf-8'),
            ContentType: 'text/plain',
          }),
        );
        this.logger.log(`Text uploaded to R2 successfully: ${objectPath}`);
        return { objectPath, success: true };
      }

      const replit = getReplitClient();
      if (replit) {
        const result = await replit.uploadFromText(objectPath, content);
        if (result.ok) {
          return { objectPath, success: true };
        }
        this.logger.error(`Replit fallback text upload failed: ${result.error}`);
        return { objectPath: '', success: false };
      }

      throw new Error('No storage backend configured');
    } catch (error) {
      this.logger.error(`Error uploading text content: ${error.message}`);
      throw error;
    }
  }

  async uploadTextDirect(objectPath: string, content: string): Promise<boolean> {
    try {
      const normalizedPath = this.normalizeObjectPath(objectPath);

      if (this.isR2Configured()) {
        await this.r2.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: normalizedPath,
            Body: Buffer.from(content, 'utf-8'),
            ContentType: 'text/plain',
          }),
        );
        return true;
      }

      const replit = getReplitClient();
      if (replit) {
        const result = await replit.uploadFromText(normalizedPath, content);
        return result.ok;
      }

      return false;
    } catch (error) {
      this.logger.error(`Error uploading text directly: ${error.message}`);
      return false;
    }
  }

  private normalizeObjectPath(filePath: string): string {
    if (!filePath) return filePath;
    let normalized = filePath.replace(/\\/g, '/');

    const uploadBaseUrl = process.env.UPLOAD_BASE_URL || '';
    if (uploadBaseUrl && normalized.startsWith(uploadBaseUrl)) {
      normalized = normalized.substring(uploadBaseUrl.length);
    }

    try {
      const url = new URL(normalized);
      normalized = url.pathname;
    } catch (e) {}

    if (normalized.startsWith('/')) {
      normalized = normalized.substring(1);
    }
    if (normalized.startsWith('uploads/')) {
      normalized = normalized.substring('uploads/'.length);
    }

    return normalized;
  }

  async downloadFile(objectPath: string): Promise<Buffer | null> {
    if (!objectPath) return null;

    const normalizedPath = this.normalizeObjectPath(objectPath);

    if (this.isR2Configured()) {
      try {
        const response = await this.r2.send(
          new GetObjectCommand({
            Bucket: this.bucket,
            Key: normalizedPath,
          }),
        );

        if (response.Body) {
          const chunks: Uint8Array[] = [];
          const stream = response.Body as any;
          for await (const chunk of stream) {
            chunks.push(chunk);
          }
          return Buffer.concat(chunks);
        }
      } catch (r2Error: any) {
        if (r2Error?.name !== 'NoSuchKey' && r2Error?.$metadata?.httpStatusCode !== 404) {
          this.logger.error(`R2 download error for ${normalizedPath}: ${r2Error.message}`);
        }
        const replit = getReplitClient();
        if (replit) {
          try {
            const result = await replit.downloadAsBytes(normalizedPath);
            if (result.ok) {
              this.logger.log(`Served from Replit fallback: ${normalizedPath}`);
              const value = result.value;
              if (Array.isArray(value) && value.length > 0 && Buffer.isBuffer(value[0])) {
                return value[0];
              }
              if (Buffer.isBuffer(value)) {
                return value;
              }
              return Buffer.from(value as unknown as Uint8Array);
            }
          } catch {
          }
        }
        return null;
      }
    }

    const replit = getReplitClient();
    if (replit) {
      try {
        const result = await replit.downloadAsBytes(normalizedPath);
        if (result.ok) {
          const value = result.value;
          if (Array.isArray(value) && value.length > 0 && Buffer.isBuffer(value[0])) {
            return value[0];
          }
          if (Buffer.isBuffer(value)) {
            return value;
          }
          return Buffer.from(value as unknown as Uint8Array);
        }
      } catch (error) {
        this.logger.error(`Replit download error: ${error.message}`);
      }
    }

    return null;
  }

  async downloadAsText(objectPath: string): Promise<string | null> {
    if (!objectPath) return null;

    const normalizedPath = this.normalizeObjectPath(objectPath);

    if (this.isR2Configured()) {
      try {
        const response = await this.r2.send(
          new GetObjectCommand({
            Bucket: this.bucket,
            Key: normalizedPath,
          }),
        );

        if (response.Body) {
          return await (response.Body as any).transformToString('utf-8');
        }
      } catch (r2Error: any) {
        if (r2Error?.name !== 'NoSuchKey' && r2Error?.$metadata?.httpStatusCode !== 404) {
          this.logger.error(`R2 text download error for ${normalizedPath}: ${r2Error.message}`);
        }
        const replit = getReplitClient();
        if (replit) {
          try {
            const result = await replit.downloadAsText(normalizedPath);
            if (result.ok) return result.value;
          } catch {
          }
        }
        return null;
      }
    }

    const replit = getReplitClient();
    if (replit) {
      try {
        const result = await replit.downloadAsText(normalizedPath);
        if (result.ok) return result.value;
      } catch (error) {
        this.logger.error(`Replit text download error: ${error.message}`);
      }
    }

    return null;
  }

  async deleteFile(objectPath: string): Promise<boolean> {
    const normalizedPath = this.normalizeObjectPath(objectPath);
    this.logger.log(`Deleting file: ${normalizedPath}`);
    let deleted = false;

    if (this.isR2Configured()) {
      try {
        await this.r2.send(
          new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: normalizedPath,
          }),
        );
        this.logger.log(`File deleted from R2: ${normalizedPath}`);
        deleted = true;
      } catch (error) {
        this.logger.error(`R2 delete error for ${normalizedPath}: ${error.message}`);
      }
    }

    const replit = getReplitClient();
    if (replit) {
      try {
        const result = await replit.delete(normalizedPath);
        if (result.ok) {
          deleted = true;
        }
      } catch {
      }
    }

    if (!deleted && !this.isR2Configured() && !replit) {
      this.logger.error(`No storage backend available to delete: ${normalizedPath}`);
      return false;
    }

    return deleted;
  }

  async fileExists(objectPath: string): Promise<boolean> {
    const normalizedPath = this.normalizeObjectPath(objectPath);

    if (this.isR2Configured()) {
      try {
        await this.r2.send(
          new HeadObjectCommand({
            Bucket: this.bucket,
            Key: normalizedPath,
          }),
        );
        return true;
      } catch {
        const replit = getReplitClient();
        if (replit) {
          try {
            const result = await replit.exists(normalizedPath);
            return result.ok && result.value;
          } catch {
          }
        }
        return false;
      }
    }

    const replit = getReplitClient();
    if (replit) {
      try {
        const result = await replit.exists(normalizedPath);
        return result.ok && result.value;
      } catch {
        return false;
      }
    }

    return false;
  }

  async listFiles(prefix?: string): Promise<string[]> {
    const r2Files = new Set<string>();
    const replitFiles = new Set<string>();

    if (this.isR2Configured()) {
      try {
        let continuationToken: string | undefined;
        do {
          const response = await this.r2.send(
            new ListObjectsV2Command({
              Bucket: this.bucket,
              Prefix: prefix,
              ContinuationToken: continuationToken,
            }),
          );
          if (response.Contents) {
            for (const obj of response.Contents) {
              if (obj.Key) r2Files.add(obj.Key);
            }
          }
          continuationToken = response.IsTruncated
            ? response.NextContinuationToken
            : undefined;
        } while (continuationToken);
      } catch (error) {
        this.logger.error(`R2 list error: ${error.message}`);
      }
    }

    const replit = getReplitClient();
    if (replit) {
      try {
        const result = await replit.list({ prefix });
        if (result.ok) {
          for (const obj of result.value) {
            replitFiles.add(obj.name);
          }
        }
      } catch (error) {
        this.logger.error(`Replit list error: ${error.message}`);
      }
    }

    const merged = new Set([...r2Files, ...replitFiles]);
    return Array.from(merged);
  }

  getPublicUrl(objectPath: string): string {
    const r2PublicUrl = process.env.R2_PUBLIC_URL;
    if (r2PublicUrl) {
      const base = r2PublicUrl.endsWith('/') ? r2PublicUrl.slice(0, -1) : r2PublicUrl;
      return `${base}/${objectPath}`;
    }
    return `/uploads/${objectPath}`;
  }

  createFilePath({
    attachmentType,
    fileNamePrefix,
    filename,
    customFileName,
  }: {
    attachmentType: string;
    fileNamePrefix?: string;
    filename?: string;
    customFileName?: string;
  }): string {
    const finalFilename = customFileName || `${fileNamePrefix}-${filename}`;
    return this.getObjectPath(attachmentType, finalFilename);
  }

  getR2Client(): S3Client {
    return this.r2;
  }

  getBucketName(): string {
    return this.bucket;
  }
}
