import {
  InjectQueue,
  OnQueueEvent,
  QueueEventsHost,
  QueueEventsListener,
} from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import {
  EmailLogStatus,
  EmailQueuerLogs,
} from 'src/entities/email-logs.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { Repository } from 'typeorm';

@QueueEventsListener('mailQueue')
export class EmailQueueEvent extends QueueEventsHost {
  private logger: PaytradeLogger;

  constructor(
    @InjectQueue('mailQueue') private readonly emailQueue: Queue,
    @InjectRepository(EmailQueuerLogs)
    private emailQueuerLogs: Repository<EmailQueuerLogs>,
  ) {
    super();
    this.logger = new PaytradeLogger('EMAIL_QUEUE_EVENT');
  }

  private async logEmailJob(job, status: EmailLogStatus, err) {
    try {
      const emailCcIds = Array.isArray(job.data.ccMail)
        ? job.data.ccMail
        : [job.data.ccMail];
      const toEmailIds = Array.isArray(job.data.toEmail)
        ? job.data.toEmail
        : [job.data.toEmail];

      const jobDetails = {
        jobId: job.id,
        fromEmailId: process.env.EMAIL_USER,
        toEmailIds,
        emailCcIds: job.data.ccMail ? emailCcIds : null,
        mailDetails: JSON.stringify(job.data),
        status,
        errorMessage: err,
        mail_type: job?.data?.mail_type ?? null,
      };

      const createdEmailQueuerLog =
        await this.emailQueuerLogs.create(jobDetails);
      await this.emailQueuerLogs.save(createdEmailQueuerLog);
    } catch (error) {
      const errorMessage = `Errored while saving logs of email job with id: ${job.id} with message: ${error}`;
      this.logger.error(errorMessage);
      throw errorMessage;
    }
  }

  // Triggered when a job completes successfully
  @OnQueueEvent('completed')
  async onCompleted({
    jobId,
    returnvalue,
  }: {
    jobId: string;
    returnvalue: any;
  }) {
    const job = await this.emailQueue.getJob(jobId);
    if (!job) return;

    await this.logEmailJob(job, 'SUCCESS', null);

    this.logger.log(`Job ${jobId} completed successfully`);
  }

  // Triggered when a job fails
  @OnQueueEvent('failed')
  async onFailed({
    jobId,
    failedReason,
  }: {
    jobId: string;
    failedReason: string;
  }) {
    const job = await this.emailQueue.getJob(jobId);
    if (!job) return;

    await this.logEmailJob(job, 'ERROR', failedReason);

    this.logger.error(`Job ${jobId} failed: ${failedReason}`);
  }

  // Triggered when there’s an error in queue events processing
  @OnQueueEvent('error')
  onError(error: Error) {
    this.logger.error(`Queue error: ${error.message}`);
  }
}
