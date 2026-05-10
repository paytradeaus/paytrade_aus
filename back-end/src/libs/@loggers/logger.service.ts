import { Injectable, LoggerService } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import { Cron } from '@nestjs/schedule';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

const logsDirectory = 'logs';
const objectStorageLogsPrefix = 'application-logs';

let sharedR2Client: S3Client | null = null;
let sharedR2Bucket: string | null = null;
let sharedR2Initialized = false;
let sharedLogBuffer: string[] = [];
let sharedFlushTimeout: NodeJS.Timeout | null = null;
let isFlushingInProgress = false;
let lastFlushAttempt = 0;
const FLUSH_INTERVAL_MS = 30000;
const MIN_FLUSH_INTERVAL_MS = 10000;

function getR2Client(): S3Client | null {
  if (sharedR2Initialized) return sharedR2Client;
  sharedR2Initialized = true;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  sharedR2Bucket = process.env.R2_BUCKET_NAME || 'paytrade';

  if (accountId && accessKeyId && secretAccessKey) {
    sharedR2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  return sharedR2Client;
}

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

    if (this.isProduction && !sharedR2Initialized) {
      const client = getR2Client();
      if (client) {
        console.log('[PaytradeLogger] Production mode detected, R2 log storage initialized');
      } else {
        console.log('[PaytradeLogger] Production mode but R2 not configured, logs are local-only');
      }
    }
  }

  @Cron('0 0 * * *')
  async handleCron() {
    await this.deleteOldFiles();
    if (this.isProduction && sharedR2Client) {
      await this.deleteOldR2Logs();
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

  async deleteOldR2Logs(): Promise<void> {
    if (!sharedR2Client || !sharedR2Bucket) return;

    const days = Number(process.env.LOG_DELETION_DAYS) || 30;
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    try {
      const response = await sharedR2Client.send(
        new ListObjectsV2Command({
          Bucket: sharedR2Bucket,
          Prefix: objectStorageLogsPrefix,
        }),
      );

      if (!response.Contents) return;

      for (const obj of response.Contents) {
        const dateMatch = obj.Key?.match(/(\d{4}-\d{2}-\d{2})\.log$/);
        if (dateMatch) {
          const fileDate = new Date(dateMatch[1]);
          if (fileDate < cutoffDate) {
            await sharedR2Client.send(
              new DeleteObjectCommand({
                Bucket: sharedR2Bucket,
                Key: obj.Key,
              }),
            );
            console.log(`Deleted R2 log: ${obj.Key}`);
          }
        }
      }
    } catch (error) {
      console.error('Error deleting old R2 logs:', error);
    }
  }

  private getR2LogPath(): string {
    const today = new Date().toJSON().slice(0, 10);
    return `${objectStorageLogsPrefix}/${today}.log`;
  }

  private async flushToR2(): Promise<void> {
    if (!sharedR2Client || !sharedR2Bucket || sharedLogBuffer.length === 0) return;
    if (isFlushingInProgress) return;

    const now = Date.now();
    if (now - lastFlushAttempt < MIN_FLUSH_INTERVAL_MS) return;

    isFlushingInProgress = true;
    lastFlushAttempt = now;

    const logsToWrite = [...sharedLogBuffer];
    sharedLogBuffer = [];

    try {
      const objectPath = this.getR2LogPath();

      let existingContent = '';
      try {
        const getResponse = await sharedR2Client.send(
          new GetObjectCommand({
            Bucket: sharedR2Bucket,
            Key: objectPath,
          }),
        );
        if (getResponse.Body) {
          existingContent = await (getResponse.Body as any).transformToString('utf-8');
        }
      } catch (e: any) {
        if (e?.name !== 'NoSuchKey' && e?.$metadata?.httpStatusCode !== 404) {
          throw e;
        }
      }

      const newContent = existingContent + logsToWrite.join('\n') + '\n';

      await sharedR2Client.send(
        new PutObjectCommand({
          Bucket: sharedR2Bucket,
          Key: objectPath,
          Body: Buffer.from(newContent, 'utf-8'),
          ContentType: 'text/plain',
        }),
      );
    } catch (error) {
      console.error('[PaytradeLogger] Error flushing logs to R2:', error);
      sharedLogBuffer = [...logsToWrite, ...sharedLogBuffer];
    } finally {
      isFlushingInProgress = false;
    }
  }

  private scheduleFlush(): void {
    if (sharedFlushTimeout) return;

    sharedFlushTimeout = setTimeout(async () => {
      sharedFlushTimeout = null;
      await this.flushToR2();
    }, FLUSH_INTERVAL_MS);
  }

  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString();
  }

  private writeLog(level: string, message: string): void {
    const logLine = `[${this.formatTimestamp()}] [${this.context}] [${level}] ${message}`;

    if (level === 'SUCCESS') {
      console.log(logLine);
    } else if (level === 'ERROR') {
      console.error(logLine);
    } else if (level === 'WARN') {
      console.warn(logLine);
    }

    fs.appendFileSync(this.logFilePath, logLine + '\n');

    if (sharedR2Client) {
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

  debug(message: string) {
    const logLine = `[${this.formatTimestamp()}] [${this.context}] [DEBUG] ${message}`;
    fs.appendFileSync(this.logFilePath, logLine + '\n');

    if (sharedR2Client) {
      sharedLogBuffer.push(logLine);
      this.scheduleFlush();
    }
  }

  verbose?(message: string) {
    const logLine = `[${this.formatTimestamp()}] [${this.context}] [VERBOSE] ${message}`;
    fs.appendFileSync(this.logFilePath, logLine + '\n');

    if (sharedR2Client) {
      sharedLogBuffer.push(logLine);
      this.scheduleFlush();
    }
  }

  async forceFlush(): Promise<void> {
    if (sharedFlushTimeout) {
      clearTimeout(sharedFlushTimeout);
      sharedFlushTimeout = null;
    }
    lastFlushAttempt = 0;
    await this.flushToR2();
  }
}
