import { Injectable } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class XeroWaitQueueService {
  constructor(@InjectQueue('xero-wait-queue') private xeroWaitQueue: Queue) {}

  async addDelayInXeroWebhookJob(data: any) {
    try {
      // Check if job already exists
      // const schedulers = await this.xeroWaitQueue.getJobSchedulers();
      // const existingJob = schedulers.find((s) => s.name === jobId);
      // console.log({ existingJob });
      // if (existingJob) {
      //   console.log(`Safeguard job already exists for company ${company_id}`);
      //   return existingJob;
      // }

      const jobId = `xero-wait-queue-${data.integrationId}-${data.resource_id}-${uuidv4()}`;
      data = data ? { ...data, jobId } : { jobId };
      const delay = Number(data.waitTime) * 60 * 1000; // 30 minutes

      const job = await this.xeroWaitQueue.add(jobId, data, {
        delay,
        attempts: 5,
        backoff: {
          type: 'fixed',
          delay: 5 * 60 * 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
        jobId,
      });
      console.log(`Xero Wait Job scheduled for resource ${data.resource_id}`);
      return job;
    } catch (error) {
      console.error('Error scheduling wait job:', error);
      throw error;
    }
  }

  async removeWaitJob(data: any) {
    try {
      const schedulers = await this.xeroWaitQueue.getJobSchedulers();
      const scheduler = schedulers.find((s) => s.name === data?.jobId);
      if (!scheduler) {
        console.warn(`No scheduler found for jobId=${data?.jobId}`);
        return false;
      }

      const removedJobResponse = await this.xeroWaitQueue.removeJobScheduler(
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
