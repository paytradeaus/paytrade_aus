import {
  OnQueueEvent,
  QueueEventsHost,
  QueueEventsListener,
} from '@nestjs/bullmq';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

const logger = new PaytradeLogger('XERO_WAIT_QUEUE_EVENTS');

@QueueEventsListener('xero-wait-queue')
export class XeroWaitQueueEvent extends QueueEventsHost {
  @OnQueueEvent('failed')
  onFailed(job: { jobId: string; failedReason?: string }) {
    logger.error(
      `Xero Wait Job ${job.jobId} failed. Reason:${JSON.stringify(job)} `,
      job.failedReason,
    );
  }

  @OnQueueEvent('added')
  onAdded(job: any) {
    logger.log(`Xero Wait Job ${JSON.stringify(job, null, 4)} added to queue`);
  }

  @OnQueueEvent('completed')
  onCompleted(job: any) {
    logger.log(`Xero Wait Job ${job.jobId} completed successfully`);
  }
}
