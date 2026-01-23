import { Injectable } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

@Injectable()
export class XeroRefreshTokenService {
  private logger = new PaytradeLogger('XERO_REFRESH_TOKEN_SERVICE');
  constructor(
    @InjectQueue('xero-refresh-token') private xeroRefreshToken: Queue,
  ) {}

  /**
   * Add a safeguard job that runs once a day for each tenant,
   * but only if one does not already exist.
   */
  async addRefreshSafeguardJob(company_id: number) {
    const jobId = `xero-refresh-safeguard-${company_id}`;

    try {
      // Check if job already exists
      const schedulers = await this.xeroRefreshToken.getJobSchedulers();
      const existingJob = schedulers.find((s) => s.name === jobId);
      this.logger.log(`existingJob: ${JSON.stringify(existingJob)}`);
      if (existingJob) {
        this.logger.log(`Safeguard job already exists for company ${company_id}`);
        return existingJob;
      }

      // If no existing job, create one
      const job = await this.xeroRefreshToken.add(
        jobId,
        { company_id },
        {
          repeat: { every: 23 * 60 * 60 * 1000 }, // every 23h
          removeOnComplete: true,
          removeOnFail: false, //for debugging
          jobId,
        },
      );

      this.logger.log(
        `Safeguard job scheduled for company ${company_id} (daily refresh)`,
      );

      return job;
    } catch (error) {
      this.logger.error(`Error scheduling safeguard job: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  async removeRefreshSafeguardJob(company_id: number) {
    const jobId = `xero-refresh-safeguard-${company_id}`;
    try {
      const schedulers = await this.xeroRefreshToken.getJobSchedulers();
      const scheduler = schedulers.find((s) => s.name === jobId);
      if (!scheduler) {
        this.logger.warn(`No scheduler found for jobId=${jobId}`);
        return false;
      }

      const removedJobResponse = await this.xeroRefreshToken.removeJobScheduler(
        scheduler.key,
      );
      this.logger.log(`removedJobResponse: ${JSON.stringify(removedJobResponse)}`);
      this.logger.log(`Stopped scheduler for jobId=${scheduler.name}`);
      return true;
    } catch (error) {
      this.logger.error(`Error scheduling safeguard job: ${JSON.stringify(error)}`);
      throw error;
    }
  }
}
