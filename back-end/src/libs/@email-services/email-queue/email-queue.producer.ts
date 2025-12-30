import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue, QueueEvents } from 'bullmq';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

@Injectable()
export class EmailQueueProducer {
  private logger: PaytradeLogger;

  constructor(@InjectQueue('mailQueue') private readonly emailQueue: Queue) {
    this.logger = new PaytradeLogger('EMAIL_QUEUE_PRODUCER');
  }

  async emailQueueProducer(mailDetails) {
    try {
      this.logger.log(
        `Request received for producing the email queue with data: ${JSON.stringify(mailDetails)}`,
      );

      const job = await this.emailQueue.add(
        'sendEmail',
        {
          ...mailDetails,
          isMailQueue: true,
        },
        //   {
        //   attempts: 2,
        //   backoff: { type: 'exponential', delay: 5000 },
        // }
      );

      if (mailDetails?.isSupport) {
        // Create QueueEvents instance for this queue
        const queueEvents = new QueueEvents('mailQueue');
        await queueEvents.waitUntilReady();

        // Wait for completion
        const response = await job.waitUntilFinished(queueEvents);

        await queueEvents.close();
        return response;
      }
    } catch (error) {
      this.logger.error(
        `Errored while producing the email queue with message: ${error}`,
      );
      throw `Errored while producing the email queue with message: ${error}`;
    }
  }
}
