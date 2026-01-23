import {
  OnQueueEvent,
  QueueEventsHost,
  QueueEventsListener,
} from '@nestjs/bullmq';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

@QueueEventsListener('xero-refresh-token')
export class XeroRefreshTokenQueueEvent extends QueueEventsHost {
  private logger = new PaytradeLogger('XERO_REFRESH_TOKEN_QUEUE_EVENTS');

  @OnQueueEvent('failed')
  onFailed(job: { jobId: string; failedReason?: string }) {
    this.logger.error(
      `Job ${job.jobId} failed. Reason:${JSON.stringify(job)} ${job.failedReason}`,
    );
  }

  @OnQueueEvent('added')
  onAdded(job: any) {
    this.logger.log(`Job ${JSON.stringify(job, null, 4)} added to queue`);
  }

  @OnQueueEvent('completed')
  onCompleted(job: any) {
    this.logger.log(`Job ${job.jobId} completed successfully`);
  }
}
