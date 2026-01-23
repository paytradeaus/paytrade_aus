import { Injectable } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { v4 as uuidv4 } from 'uuid';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

@Injectable()
export class XeroWaitQueueService {
  private logger = new PaytradeLogger('XERO_WAIT_QUEUE_SERVICE');

  constructor(@InjectQueue('xero-wait-queue') private xeroWaitQueue: Queue) {}

  async addDelayInXeroWebhookJob(data: any) {
    try {
      const jobId = `xero-wait-queue-${data.integrationId}-${data.resource_id}-${uuidv4()}`;
      data = data ? { ...data, jobId } : { jobId };
      const delay = Number(data.waitTime) * 60 * 1000;

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
      this.logger.log(`Xero Wait Job scheduled for resource ${data.resource_id}`);
      return job;
    } catch (error) {
      this.logger.error(`Error scheduling wait job: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  async removeWaitJob(data: any) {
    try {
      const schedulers = await this.xeroWaitQueue.getJobSchedulers();
      const scheduler = schedulers.find((s) => s.name === data?.jobId);
      if (!scheduler) {
        this.logger.warn(`No scheduler found for jobId=${data?.jobId}`);
        return false;
      }

      const removedJobResponse = await this.xeroWaitQueue.removeJobScheduler(
        scheduler.key,
      );
      this.logger.log(`removedJobResponse: ${JSON.stringify({ removedJobResponse })}`);
      this.logger.log(`Stopped scheduler for jobId=${scheduler.name}`);
      return true;
    } catch (error) {
      this.logger.error(`Error scheduling safeguard job: ${JSON.stringify(error)}`);
      throw error;
    }
  }
}
