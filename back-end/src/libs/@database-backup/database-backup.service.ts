import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as moment from 'moment-timezone';
import { ObjectStorageService } from '../@object-storage/object-storage.service';

const execAsync = promisify(exec);

@Injectable()
export class DatabaseBackupService {
  private readonly logger = new Logger(DatabaseBackupService.name);

  constructor(private readonly objectStorageService: ObjectStorageService) {}

  @Cron(CronExpression.EVERY_WEEK)
  async handleWeeklyBackup() {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log('Skipping backup - not in production environment');
      return;
    }

    this.logger.log('Starting weekly database backup...');
    await this.createBackup();
  }

  async createBackup(): Promise<string | null> {
    const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
    const backupFileName = `db_backup_${timestamp}.sql`;
    const tempFilePath = path.join('/tmp', backupFileName);

    try {
      const databaseUrl = process.env.DATABASE_URL;
      
      if (!databaseUrl) {
        this.logger.error('DATABASE_URL not found');
        return null;
      }

      this.logger.log(`Creating backup: ${backupFileName}`);

      await execAsync(`pg_dump "${databaseUrl}" --no-owner --no-acl > "${tempFilePath}"`);

      const fileStats = fs.statSync(tempFilePath);
      this.logger.log(`Backup file created: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);

      const fileBuffer = fs.readFileSync(tempFilePath);
      const objectPath = `database-backups/${backupFileName}`;
      
      await this.objectStorageService.uploadFileDirect(objectPath, fileBuffer);
      this.logger.log(`Backup uploaded to Object Storage: ${objectPath}`);

      fs.unlinkSync(tempFilePath);
      this.logger.log('Temporary file cleaned up');

      await this.cleanupOldBackups();

      return objectPath;
    } catch (error) {
      this.logger.error(`Backup failed: ${error.message}`);
      
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      return null;
    }
  }

  private async cleanupOldBackups() {
    try {
      const files = await this.objectStorageService.listFiles('database-backups/');
      
      if (!files || files.length <= 7) {
        return;
      }

      const sortedFiles = files
        .filter(f => f.startsWith('database-backups/db_backup_'))
        .sort()
        .reverse();

      const filesToDelete = sortedFiles.slice(7);

      for (const file of filesToDelete) {
        await this.objectStorageService.deleteFile(file);
        this.logger.log(`Deleted old backup: ${file}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to cleanup old backups: ${error.message}`);
    }
  }

  async listBackups(): Promise<string[]> {
    try {
      const files = await this.objectStorageService.listFiles('database-backups/');
      return files?.filter(f => f.startsWith('database-backups/db_backup_')).sort().reverse() || [];
    } catch (error) {
      this.logger.error(`Failed to list backups: ${error.message}`);
      return [];
    }
  }

  async downloadBackup(backupPath: string): Promise<Buffer | null> {
    try {
      return await this.objectStorageService.downloadFile(backupPath);
    } catch (error) {
      this.logger.error(`Failed to download backup: ${error.message}`);
      return null;
    }
  }
}
