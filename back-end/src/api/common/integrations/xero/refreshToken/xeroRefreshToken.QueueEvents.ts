import {
  OnQueueEvent,
  QueueEventsHost,
  QueueEventsListener,
} from '@nestjs/bullmq';

@QueueEventsListener('xero-refresh-token')
export class XeroRefreshTokenQueueEvent extends QueueEventsHost {
  @OnQueueEvent('failed')
  onFailed(job: { jobId: string; failedReason?: string }) {
    console.error(
      `Job ${job.jobId} failed. Reason:${JSON.stringify(job)} `,
      job.failedReason,
    );
  }

  @OnQueueEvent('added')
  onAdded(job: any) {
    console.log(`Job ${JSON.stringify(job, null, 4)} added to queue`);
  }

  @OnQueueEvent('completed')
  onCompleted(job: any) {
    console.log(`Job ${job.jobId} completed successfully`);
  }
}
