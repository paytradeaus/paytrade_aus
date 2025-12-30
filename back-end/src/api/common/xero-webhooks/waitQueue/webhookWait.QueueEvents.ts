import {
  OnQueueEvent,
  QueueEventsHost,
  QueueEventsListener,
} from '@nestjs/bullmq';

@QueueEventsListener('xero-wait-queue')
export class XeroWaitQueueEvent extends QueueEventsHost {
  @OnQueueEvent('failed')
  onFailed(job: { jobId: string; failedReason?: string }) {
    console.error(
      `Xero Wait Job ${job.jobId} failed. Reason:${JSON.stringify(job)} `,
      job.failedReason,
    );
  }

  @OnQueueEvent('added')
  onAdded(job: any) {
    console.log(`Xero Wait Job ${JSON.stringify(job, null, 4)} added to queue`);
  }

  @OnQueueEvent('completed')
  onCompleted(job: any) {
    console.log(`Xero Wait Job ${job.jobId} completed successfully`);
  }
}
