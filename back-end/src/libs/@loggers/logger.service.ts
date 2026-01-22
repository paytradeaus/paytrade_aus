import { Injectable, LoggerService } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import { Cron } from '@nestjs/schedule';
const logsDirectory = 'logs';

@Injectable()
export class PaytradeLogger implements LoggerService {
  private readonly logFilePath: string;
  private readonly context: string;

  constructor(context?: string) {
    if (!fs.existsSync(logsDirectory)) {
      fs.mkdirSync(logsDirectory, { recursive: true });
    }
    const dateToday = new Date().toJSON().slice(0, 10);
    this.logFilePath = path.join(logsDirectory, `${dateToday}.log`);
    this.context = context;
  }

  // @Cron('*/3 * * * *')
  @Cron('0 0 * * *') // Runs every day at midnight
  async handleCron() {
    await this.deleteOldFiles();
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
          console.log(`Deleted: ${filePath}`);
        }
      }
    } catch (error) {
      console.error(`Error processing directory ${logsDirectory}:`, error);
    }
  }

  log(message: string) {
    const logLine = `[${new Date().toLocaleTimeString()}, ${new Date().toLocaleDateString()}] [${this.context}] [SUCCESS] ${message}`;
    console.log(logLine);
    fs.appendFileSync(this.logFilePath, logLine + '\n');
  }

  error(message: string, trace?: string) {
    const logLine = `[${new Date().toLocaleTimeString()}, ${new Date().toLocaleDateString()}] [${this.context}] [ERROR] ${message}`;
    console.error(logLine);
    fs.appendFileSync(this.logFilePath, logLine + '\n');
  }

  warn(message: string) {
    const logLine = `[${new Date().toLocaleTimeString()}, ${new Date().toLocaleDateString()}] [${this.context}] [WARN] ${message}`;
    console.warn(logLine);
    fs.appendFileSync(this.logFilePath, logLine + '\n');
  }

  debug?(message: string) {
    fs.appendFileSync(
      this.logFilePath,
      `[${new Date().toLocaleTimeString()}, ${new Date().toLocaleDateString()}] [${this.context}] [DEBUG] ${message}\n`,
    );
  }

  verbose?(message: string) {
    fs.appendFileSync(
      this.logFilePath,
      `[${new Date().toLocaleTimeString()}, ${new Date().toLocaleDateString()}] [${this.context}] [VERBOSE] ${message}\n`,
    );
  }
}
