import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { EmailService } from '../email.service';

@Processor('mailQueue')
export class EmailQueueConsumer extends WorkerHost {
  private logger: PaytradeLogger;

  constructor(private readonly emailService: EmailService) {
    super();
    this.logger = new PaytradeLogger('EMAIL_QUEUE_CONSUMER');
  }

  async process(job: Job, token?: string): Promise<any> {
    try {
      const payload = job?.data;
      let response = null;

      console.log(`job id: `, job?.id);

      console.log(`Sending email through queue - ${payload?.toEmail}`);

      // Support Ticket - MailGun
      if (payload?.isSupport) {
        response = await this.emailService.sentSupportMail(payload);
      } else {
        await this.emailService.sendMail(payload);
      }

      this.logger.log(`Email sent`);
      console.log(`Email sent - ${payload?.toEmail}`);

      if (payload?.isSupport && response) {
        return response;
      }
    } catch (error) {
      const errMsg = error?.message ? error?.message : error;
      this.logger.error(`Failed to send mail to: ${errMsg}`);
      console.log(`Failed to send mail to: ${errMsg}`);
      throw error;
    }
  }
}
