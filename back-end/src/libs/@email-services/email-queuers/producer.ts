// import { Injectable } from '@nestjs/common';
// import { Queue } from 'bullmq';
// import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

// @Injectable()
// export class EmailQueueProducer {
//   private logger: PaytradeLogger;
//   private mailQueue: Queue;
//   constructor() {
//     this.logger = new PaytradeLogger('EMAIL_QUEUE_PRODUCER');
//     this.mailQueue = new Queue('emailQueue', {
//       connection: {
//         host: process.env.REDIS_HOST,
//         port: +process.env.REDIS_PORT,
//       },
//     });
//   }

//   private log(message: string) {
//     this.logger.log(`${message}`);
//   }

//   private logError(message: string) {
//     this.logger.error(`${message}`);
//   }

//   async emailQueueProducer(mailDetails) {
//     try {
//       this.logger.log(
//         `Request received for producing the email queue with data: ${JSON.stringify(mailDetails)}`,
//       );
//       await this.mailQueue.add('sendEmail', mailDetails);
//     } catch (error) {
//       this.logger.error(
//         `Errored while producing the email queue with message: ${error}`,
//       );
//       throw `Errored while producing the email queue with message: ${error}`;
//     }
//   }
// }
