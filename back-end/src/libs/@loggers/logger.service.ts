import { Injectable, LoggerService } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import { Cron } from '@nestjs/schedule';
import { Client } from '@replit/object-storage';

const logsDirectory = 'logs';
const objectStorageLogsPrefix = 'application-logs';

@Injectable()
export class PaytradeLogger implements LoggerService {
  private readonly logFilePath: string;
  private readonly context: string;
  private readonly dateToday: string;
  private objectStorageClient: Client | null = null;
  private logBuffer: string[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;
  private readonly isProduction: boolean;

  constructor(context?: string) {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.dateToday = new Date().toJSON().slice(0, 10);
    this.context = context;

    if (!fs.existsSync(logsDirectory)) {
      fs.mkdirSync(logsDirectory, { recursive: true });
    }
    this.logFilePath = path.join(logsDirectory, `${this.dateToday}.log`);

    if (this.isProduction) {
      try {
        this.objectStorageClient = new Client();
      } catch (error) {
        console.error('Failed to initialize Object Storage client for logging:', error);
      }
    }
  }

  @Cron('0 0 * * *')
  async handleCron() {
    await this.deleteOldFiles();
    if (this.isProduction) {
      await this.deleteOldObjectStorageLogs();
    }
  }

  async deleteOldFiles(): Promise<void> {
    const days = Number(process.env.LOG_DELETION_DAYS) || 30;
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    try {
      const files = await fsPromises.readdir(logsDirectory);
      for (const file of files) {
        const filePath = path.join(logsDirectory, file);
        const stats = await fsPromises.stat(filePath);

        if (stats.isFile() && stats.mtime < cutoffDate) {
          await fsPromises.unlink(filePath);
          console.log(`Deleted local log: ${filePath}`);
        }
      }
    } catch (error) {
      console.error(`Error processing directory ${logsDirectory}:`, error);
    }
  }

  async deleteOldObjectStorageLogs(): Promise<void> {
    if (!this.objectStorageClient) return;

    const days = Number(process.env.LOG_DELETION_DAYS) || 30;
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    try {
      const listResult = await this.objectStorageClient.list({ prefix: objectStorageLogsPrefix });
      if (!listResult.ok) {
        console.error('Failed to list Object Storage logs:', listResult.error);
        return;
      }

      for (const obj of listResult.value) {
        const dateMatch = obj.name.match(/(\d{4}-\d{2}-\d{2})\.log$/);
        if (dateMatch) {
          const fileDate = new Date(dateMatch[1]);
          if (fileDate < cutoffDate) {
            const deleteResult = await this.objectStorageClient.delete(obj.name);
            if (deleteResult.ok) {
              console.log(`Deleted Object Storage log: ${obj.name}`);
            } else {
              console.error(`Failed to delete Object Storage log ${obj.name}:`, deleteResult.error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error deleting old Object Storage logs:', error);
    }
  }

  private getObjectStorageLogPath(): string {
    return `${objectStorageLogsPrefix}/${this.dateToday}.log`;
  }

  private async flushToObjectStorage(): Promise<void> {
    if (!this.objectStorageClient || this.logBuffer.length === 0) return;

    const logsToWrite = [...this.logBuffer];
    this.logBuffer = [];

    try {
      const objectPath = this.getObjectStorageLogPath();
      
      let existingContent = '';
      const downloadResult = await this.objectStorageClient.downloadAsText(objectPath);
      if (downloadResult.ok) {
        existingContent = downloadResult.value;
      }

      const newContent = existingContent + logsToWrite.join('\n') + '\n';
      
      const uploadResult = await this.objectStorageClient.uploadFromText(objectPath, newContent);
      if (!uploadResult.ok) {
        console.error('Failed to upload logs to Object Storage:', uploadResult.error);
        this.logBuffer = [...logsToWrite, ...this.logBuffer];
      }
    } catch (error) {
      console.error('Error flushing logs to Object Storage:', error);
      this.logBuffer = [...logsToWrite, ...this.logBuffer];
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimeout) return;
    
    this.flushTimeout = setTimeout(async () => {
      this.flushTimeout = null;
      await this.flushToObjectStorage();
    }, 5000);
  }

  private writeLog(level: string, message: string): void {
    const logLine = `[${new Date().toLocaleTimeString()}, ${new Date().toLocaleDateString()}] [${this.context}] [${level}] ${message}`;
    
    if (level === 'SUCCESS') {
      console.log(logLine);
    } else if (level === 'ERROR') {
      console.error(logLine);
    } else if (level === 'WARN') {
      console.warn(logLine);
    }

    fs.appendFileSync(this.logFilePath, logLine + '\n');

    if (this.isProduction && this.objectStorageClient) {
      this.logBuffer.push(logLine);
      this.scheduleFlush();
    }
  }

  log(message: string) {
    this.writeLog('SUCCESS', message);
  }

  error(message: string, trace?: string) {
    this.writeLog('ERROR', message);
  }

  warn(message: string) {
    this.writeLog('WARN', message);
  }

  debug?(message: string) {
    const logLine = `[${new Date().toLocaleTimeString()}, ${new Date().toLocaleDateString()}] [${this.context}] [DEBUG] ${message}`;
    fs.appendFileSync(this.logFilePath, logLine + '\n');
    
    if (this.isProduction && this.objectStorageClient) {
      this.logBuffer.push(logLine);
      this.scheduleFlush();
    }
  }

  verbose?(message: string) {
    const logLine = `[${new Date().toLocaleTimeString()}, ${new Date().toLocaleDateString()}] [${this.context}] [VERBOSE] ${message}`;
    fs.appendFileSync(this.logFilePath, logLine + '\n');
    
    if (this.isProduction && this.objectStorageClient) {
      this.logBuffer.push(logLine);
      this.scheduleFlush();
    }
  }

  async forceFlush(): Promise<void> {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }
    await this.flushToObjectStorage();
  }
}
