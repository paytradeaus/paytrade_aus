import { Injectable } from '@nestjs/common';
import { Client } from '@replit/object-storage';
import { PaytradeLogger } from '../@loggers/logger.service';
import * as path from 'path';

@Injectable()
export class ObjectStorageService {
  private client: Client;
  private logger: PaytradeLogger;
  private bucketName = 'paytrade_uploads';

  constructor() {
    this.client = new Client();
    this.logger = new PaytradeLogger('OBJECT_STORAGE_SERVICE');
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
      default:
        baseDir = 'misc';
    }
    return `${baseDir}/${filename}`;
  }

  async uploadFile(
    fileBuffer: Buffer,
    attachmentType: string,
    filename: string,
    contentType?: string,
  ): Promise<{ objectPath: string; success: boolean }> {
    const objectPath = this.getObjectPath(attachmentType, filename);
    
    try {
      this.logger.log(`Uploading file to object storage: ${objectPath}`);
      
      const result = await this.client.uploadFromBytes(objectPath, fileBuffer);
      
      if (result.ok) {
        this.logger.log(`File uploaded successfully: ${objectPath}`);
        return { objectPath, success: true };
      } else {
        this.logger.error(`Failed to upload file: ${result.error}`);
        return { objectPath: '', success: false };
      }
    } catch (error) {
      this.logger.error(`Error uploading file: ${error.message}`);
      throw error;
    }
  }

  async uploadFileDirect(
    objectPath: string,
    fileBuffer: Buffer,
  ): Promise<boolean> {
    try {
      const normalizedPath = this.normalizeObjectPath(objectPath);
      this.logger.log(`Uploading file directly to object storage: ${normalizedPath}`);
      
      const result = await this.client.uploadFromBytes(normalizedPath, fileBuffer);
      
      if (result.ok) {
        this.logger.log(`File uploaded successfully: ${normalizedPath}`);
        return true;
      } else {
        this.logger.error(`Failed to upload file: ${result.error}`);
        return false;
      }
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
      this.logger.log(`Uploading text content to object storage: ${objectPath}`);
      
      const result = await this.client.uploadFromText(objectPath, content);
      
      if (result.ok) {
        this.logger.log(`Text content uploaded successfully: ${objectPath}`);
        return { objectPath, success: true };
      } else {
        this.logger.error(`Failed to upload text content: ${result.error}`);
        return { objectPath: '', success: false };
      }
    } catch (error) {
      this.logger.error(`Error uploading text content: ${error.message}`);
      throw error;
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
    } catch (e) {
    }
    
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
    
    try {
      this.logger.log(`Downloading file from object storage: ${normalizedPath}`);
      
      const result = await this.client.downloadAsBytes(normalizedPath);
      
      if (result.ok) {
        this.logger.log(`File downloaded successfully: ${normalizedPath}`);
        const value = result.value;
        if (Array.isArray(value) && value.length > 0 && Buffer.isBuffer(value[0])) {
          return value[0];
        }
        if (Buffer.isBuffer(value)) {
          return value;
        }
        const bytes = value as unknown as Uint8Array;
        return Buffer.from(bytes);
      } else {
        this.logger.error(`Failed to download file: ${result.error}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Error downloading file: ${error.message}`);
      return null;
    }
  }

  async downloadAsText(objectPath: string): Promise<string | null> {
    try {
      this.logger.log(`Downloading text from object storage: ${objectPath}`);
      
      const result = await this.client.downloadAsText(objectPath);
      
      if (result.ok) {
        this.logger.log(`Text downloaded successfully: ${objectPath}`);
        return result.value;
      } else {
        this.logger.error(`Failed to download text: ${result.error}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Error downloading text: ${error.message}`);
      return null;
    }
  }

  async deleteFile(objectPath: string): Promise<boolean> {
    try {
      this.logger.log(`Deleting file from object storage: ${objectPath}`);
      
      const result = await this.client.delete(objectPath);
      
      if (result.ok) {
        this.logger.log(`File deleted successfully: ${objectPath}`);
        return true;
      } else {
        this.logger.error(`Failed to delete file: ${result.error}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error deleting file: ${error.message}`);
      return false;
    }
  }

  async fileExists(objectPath: string): Promise<boolean> {
    try {
      const result = await this.client.exists(objectPath);
      return result.ok && result.value;
    } catch (error) {
      this.logger.error(`Error checking file existence: ${error.message}`);
      return false;
    }
  }

  async listFiles(prefix?: string): Promise<string[]> {
    try {
      const result = await this.client.list({ prefix });
      if (result.ok) {
        return result.value.map(obj => obj.name);
      }
      return [];
    } catch (error) {
      this.logger.error(`Error listing files: ${error.message}`);
      return [];
    }
  }

  getPublicUrl(objectPath: string): string {
    const replitUrl = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(',')[0];
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
}
