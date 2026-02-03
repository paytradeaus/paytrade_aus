import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as https from 'https';

@Injectable()
export class KeepAliveService {
  private readonly logger = new Logger(KeepAliveService.name);
  private readonly appUrl = process.env.DEPLOYED_URL || process.env.NEXT_PUBLIC_DEPLOYED_URL;

  @Cron(CronExpression.EVERY_5_MINUTES)
  async keepAlive() {
    if (process.env.REPLIT_DEPLOYMENT !== '1') {
      return;
    }

    if (!this.appUrl) {
      return;
    }

    try {
      const healthUrl = new URL('/health', this.appUrl).toString();
      
      await new Promise<void>((resolve) => {
        const req = https.get(healthUrl, { timeout: 10000 }, (res) => {
          if (res.statusCode === 200) {
            this.logger.log(`Keep-alive ping successful: ${res.statusCode}`);
          } else {
            this.logger.warn(`Keep-alive ping returned: ${res.statusCode}`);
          }
          res.resume();
          resolve();
        });

        req.on('error', (err) => {
          this.logger.error(`Keep-alive ping failed: ${err.message}`);
          resolve();
        });

        req.on('timeout', () => {
          req.destroy();
          this.logger.warn('Keep-alive ping timeout');
          resolve();
        });
      });
    } catch (error) {
      this.logger.error(`Keep-alive error: ${error.message}`);
    }
  }
}
