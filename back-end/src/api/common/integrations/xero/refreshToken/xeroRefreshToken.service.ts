import { Injectable } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class XeroRefreshTokenService {
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
      console.log({ existingJob });
      if (existingJob) {
        console.log(`Safeguard job already exists for company ${company_id}`);
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

      console.log(
        `Safeguard job scheduled for company ${company_id} (daily refresh)`,
      );

      return job;
    } catch (error) {
      console.error('Error scheduling safeguard job:', error);
      throw error;
    }
  }

  async removeRefreshSafeguardJob(company_id: number) {
    const jobId = `xero-refresh-safeguard-${company_id}`;
    try {
      const schedulers = await this.xeroRefreshToken.getJobSchedulers();
      const scheduler = schedulers.find((s) => s.name === jobId);
      if (!scheduler) {
        console.warn(`No scheduler found for jobId=${jobId}`);
        return false;
      }

      const removedJobResponse = await this.xeroRefreshToken.removeJobScheduler(
        scheduler.key,
      );
      console.log({ removedJobResponse });
      console.log(`Stopped scheduler for jobId=${scheduler.name}`);
      return true;
    } catch (error) {
      console.error('Error scheduling safeguard job:', error);
      throw error;
    }
  }
}
