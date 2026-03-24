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
      
      const result = await new Promise<{ statusCode: number; body: string }>((resolve) => {
        const req = https.get(healthUrl, { timeout: 10000 }, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            resolve({ statusCode: res.statusCode, body: data });
          });
        });

        req.on('error', (err) => {
          this.logger.error(`Keep-alive ping failed: ${err.message}`);
          resolve({ statusCode: 0, body: err.message });
        });

        req.on('timeout', () => {
          req.destroy();
          this.logger.warn('Keep-alive ping timeout');
          resolve({ statusCode: 0, body: 'timeout' });
        });
      });

      if (result.statusCode === 200) {
        this.logger.log(`Keep-alive ping successful: ${result.statusCode}`);
      } else if (result.statusCode === 503) {
        try {
          const status = JSON.parse(result.body);
          this.logger.warn(`Keep-alive: service degraded - backend: ${status.backend}, frontend: ${status.frontend}`);
        } catch (e) {
          this.logger.warn(`Keep-alive ping returned: ${result.statusCode}`);
        }
      } else if (result.statusCode > 0) {
        this.logger.warn(`Keep-alive ping returned: ${result.statusCode}`);
      }
    } catch (error) {
      this.logger.error(`Keep-alive error: ${error.message}`);
    }
  }
}
