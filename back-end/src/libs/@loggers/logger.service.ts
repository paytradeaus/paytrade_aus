import { Injectable, LoggerService } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import { Cron } from '@nestjs/schedule';
import { Client } from '@replit/object-storage';

const logsDirectory = 'logs';
const objectStorageLogsPrefix = 'application-logs';

let sharedObjectStorageClient: Client | null = null;
let sharedLogBuffer: string[] = [];
let sharedFlushTimeout: NodeJS.Timeout | null = null;
let isFlushingInProgress = false;
let lastFlushAttempt = 0;
const FLUSH_INTERVAL_MS = 30000; // 30 seconds
const MIN_FLUSH_INTERVAL_MS = 10000; // Minimum 10 seconds between flush attempts

@Injectable()
export class PaytradeLogger implements LoggerService {
  private readonly logFilePath: string;
  private readonly context: string;
  private readonly dateToday: string;
  private readonly isProduction: boolean;

  constructor(context?: string) {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.dateToday = new Date().toJSON().slice(0, 10);
    this.context = context;

    if (!fs.existsSync(logsDirectory)) {
      fs.mkdirSync(logsDirectory, { recursive: true });
    }
    this.logFilePath = path.join(logsDirectory, `${this.dateToday}.log`);

    if (this.isProduction && !sharedObjectStorageClient) {
      console.log(`[PaytradeLogger] Production mode detected (NODE_ENV=${process.env.NODE_ENV}), initializing Object Storage logging...`);
      try {
        sharedObjectStorageClient = new Client();
        console.log('[PaytradeLogger] Object Storage client initialized successfully');
      } catch (error) {
        console.error('[PaytradeLogger] Failed to initialize Object Storage client:', error);
      }
    }
  }

  private get objectStorageClient(): Client | null {
    return sharedObjectStorageClient;
  }

  private get logBuffer(): string[] {
    return sharedLogBuffer;
  }

  private set logBuffer(value: string[]) {
    sharedLogBuffer = value;
  }

  private get flushTimeout(): NodeJS.Timeout | null {
    return sharedFlushTimeout;
  }

  private set flushTimeout(value: NodeJS.Timeout | null) {
    sharedFlushTimeout = value;
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
    // Always use current date to handle day changes
    const today = new Date().toJSON().slice(0, 10);
    return `${objectStorageLogsPrefix}/${today}.log`;
  }

  private async flushToObjectStorage(): Promise<void> {
    // Prevent concurrent flushes and respect rate limits
    if (!sharedObjectStorageClient || sharedLogBuffer.length === 0) return;
    if (isFlushingInProgress) return;
    
    const now = Date.now();
    if (now - lastFlushAttempt < MIN_FLUSH_INTERVAL_MS) return;

    isFlushingInProgress = true;
    lastFlushAttempt = now;

    const logsToWrite = [...sharedLogBuffer];
    sharedLogBuffer = [];

    try {
      const objectPath = this.getObjectStorageLogPath();
      
      let existingContent = '';
      const downloadResult = await sharedObjectStorageClient.downloadAsText(objectPath);
      if (downloadResult.ok) {
        existingContent = downloadResult.value;
      }

      const newContent = existingContent + logsToWrite.join('\n') + '\n';
      
      const uploadResult = await sharedObjectStorageClient.uploadFromText(objectPath, newContent);
      if (!uploadResult.ok) {
        console.error('[PaytradeLogger] Failed to upload logs to Object Storage:', uploadResult.error);
        // Put logs back at the front of the buffer
        sharedLogBuffer = [...logsToWrite, ...sharedLogBuffer];
      }
    } catch (error) {
      console.error('[PaytradeLogger] Error flushing logs to Object Storage:', error);
      sharedLogBuffer = [...logsToWrite, ...sharedLogBuffer];
    } finally {
      isFlushingInProgress = false;
    }
  }

  private scheduleFlush(): void {
    if (sharedFlushTimeout) return;
    
    sharedFlushTimeout = setTimeout(async () => {
      sharedFlushTimeout = null;
      await this.flushToObjectStorage();
    }, FLUSH_INTERVAL_MS);
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

    // Use shared client directly - don't rely on instance isProduction flag
    if (sharedObjectStorageClient) {
      sharedLogBuffer.push(logLine);
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
    
    if (sharedObjectStorageClient) {
      sharedLogBuffer.push(logLine);
      this.scheduleFlush();
    }
  }

  verbose?(message: string) {
    const logLine = `[${new Date().toLocaleTimeString()}, ${new Date().toLocaleDateString()}] [${this.context}] [VERBOSE] ${message}`;
    fs.appendFileSync(this.logFilePath, logLine + '\n');
    
    if (sharedObjectStorageClient) {
      sharedLogBuffer.push(logLine);
      this.scheduleFlush();
    }
  }

  async forceFlush(): Promise<void> {
    if (sharedFlushTimeout) {
      clearTimeout(sharedFlushTimeout);
      sharedFlushTimeout = null;
    }
    // Reset the last flush attempt to allow immediate flush
    lastFlushAttempt = 0;
    await this.flushToObjectStorage();
  }
}
