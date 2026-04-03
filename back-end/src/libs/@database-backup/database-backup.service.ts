import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as moment from 'moment-timezone';
import { ObjectStorageService } from '../@object-storage/object-storage.service';

const execAsync = promisify(exec);

const RETENTION_HOURLY = 30;
const RETENTION_DAILY_DAYS = 30;
const RETENTION_MONTHLY_MONTHS = 6;

@Injectable()
export class DatabaseBackupService {
  private readonly logger = new Logger(DatabaseBackupService.name);

  constructor(private readonly objectStorageService: ObjectStorageService) {}

  @Cron('0 */6 * * *')
  async handleScheduledBackup() {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log('Skipping backup - not in production environment');
      return;
    }

    this.logger.log('Starting scheduled database backup...');
    await this.createBackup();
  }

  async createBackup(): Promise<string | null> {
    const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
    const backupFileName = `db_backup_${timestamp}.sql.gz`;
    const tempFilePath = path.join('/tmp', backupFileName);

    try {
      const databaseUrl = process.env.DATABASE_URL;

      if (!databaseUrl) {
        this.logger.error('DATABASE_URL not found');
        return null;
      }

      this.logger.log(`Creating compressed backup: ${backupFileName}`);

      await execAsync(
        `pg_dump "${databaseUrl}" --no-owner --no-acl | gzip > "${tempFilePath}"`,
        { maxBuffer: 100 * 1024 * 1024 },
      );

      const fileStats = fs.statSync(tempFilePath);
      this.logger.log(
        `Backup file created: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB (compressed)`,
      );

      const fileBuffer = fs.readFileSync(tempFilePath);
      const objectPath = `database-backups/${backupFileName}`;

      await this.objectStorageService.uploadFileDirect(
        objectPath,
        fileBuffer,
        'application/gzip',
      );
      this.logger.log(`Backup uploaded to R2: ${objectPath}`);

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

  private parseBackupDay(file: string): string | null {
    const match = file.match(/db_backup_(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  }

  private parseBackupMonth(file: string): string | null {
    const match = file.match(/db_backup_(\d{4}-\d{2})/);
    return match ? match[1] : null;
  }

  private async cleanupOldBackups() {
    try {
      const files = await this.objectStorageService.listFiles('database-backups/');

      if (!files || files.length === 0) {
        return;
      }

      const backupFiles = files
        .filter((f) => f.startsWith('database-backups/db_backup_'))
        .sort()
        .reverse();

      if (backupFiles.length <= RETENTION_HOURLY) {
        return;
      }

      const now = moment();
      const keepSet = new Set<string>();

      for (let i = 0; i < Math.min(RETENTION_HOURLY, backupFiles.length); i++) {
        keepSet.add(backupFiles[i]);
      }

      const dailyCutoff = moment().subtract(RETENTION_DAILY_DAYS, 'days');
      const seenDays = new Set<string>();
      for (const file of backupFiles) {
        if (keepSet.has(file)) continue;
        const day = this.parseBackupDay(file);
        if (!day) continue;
        const fileDate = moment(day, 'YYYY-MM-DD');
        if (fileDate.isBefore(dailyCutoff)) continue;
        if (seenDays.has(day)) continue;
        seenDays.add(day);
        keepSet.add(file);
      }

      const monthlyCutoff = moment().subtract(RETENTION_MONTHLY_MONTHS, 'months');
      const seenMonths = new Set<string>();
      for (const file of backupFiles) {
        if (keepSet.has(file)) continue;
        const month = this.parseBackupMonth(file);
        const day = this.parseBackupDay(file);
        if (!month || !day) continue;
        const fileDate = moment(day, 'YYYY-MM-DD');
        if (fileDate.isBefore(monthlyCutoff)) continue;
        if (seenMonths.has(month)) continue;
        seenMonths.add(month);
        keepSet.add(file);
      }

      const filesToDelete = backupFiles.filter((f) => !keepSet.has(f));

      for (const file of filesToDelete) {
        await this.objectStorageService.deleteFile(file);
        this.logger.log(`Deleted old backup: ${file}`);
      }

      this.logger.log(
        `Retention cleanup: kept ${keepSet.size}, deleted ${filesToDelete.length}`,
      );
    } catch (error) {
      this.logger.warn(`Failed to cleanup old backups: ${error.message}`);
    }
  }

  async listBackups(): Promise<string[]> {
    try {
      const files =
        await this.objectStorageService.listFiles('database-backups/');
      return (
        files
          ?.filter((f) => f.startsWith('database-backups/db_backup_'))
          .sort()
          .reverse() || []
      );
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
