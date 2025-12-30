// import { Injectable } from '@nestjs/common';
// import { Worker } from 'bullmq';
// import { EmailService } from '../email.service';
// import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
// import {
//   EmailLogStatus,
//   EmailQueuerLogs,
// } from 'src/entities/email-logs.entity';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';

// @Injectable()
// export class EmailQueueConsumer {
//   private logger: PaytradeLogger;
//   constructor(
//     private emailService: EmailService,
//     @InjectRepository(EmailQueuerLogs)
//     private emailQueuerLogs: Repository<EmailQueuerLogs>,
//   ) {
//     this.logger = new PaytradeLogger('EMAIL_QUEUE_CONSUMER');
//   }

//   private log(message: string) {
//     this.logger.log(`${message}`);
//   }

//   private logError(message: string) {
//     this.logger.error(`${message}`);
//   }

//   private async logEmailJob(job, status: EmailLogStatus, err) {
//     try {
//       const emailCcIds = Array.isArray(job.data.ccMail)
//         ? job.data.ccMail
//         : [job.data.ccMail];
//       const toEmailIds = Array.isArray(job.data.toEmail)
//         ? job.data.toEmail
//         : [job.data.toEmail];

//       const jobDetails = {
//         jobId: job.id,
//         fromEmailId: process.env.EMAIL_USER,
//         toEmailIds,
//         emailCcIds: job.data.ccMail ? emailCcIds : null,
//         mailDetails: JSON.stringify(job.data),
//         status,
//         errorMessage: err,
//       };

//       const createdEmailQueuerLog =
//         await this.emailQueuerLogs.create(jobDetails);
//       await this.emailQueuerLogs.save(createdEmailQueuerLog);
//     } catch (error) {
//       const errorMessage = `Errored while saving logs of email job with id: ${job.id} with message: ${error}`;
//       this.logger.error(errorMessage);
//       throw errorMessage;
//     }
//   }

//   async emailQueueConsumer() {
//     try {
//       this.logger.log(`Email consumer started successfully.`);

//       const worker = new Worker(
//         'emailQueue',
//         async (job) => {
//           await this.emailService.sendMail(job.data);
//         },
//         {
//           connection: {
//             host: process.env.REDIS_HOST,
//             port: +process.env.REDIS_PORT,
//           },
//         },
//       );

//       worker.on('completed', async (job) => {
//         this.logger.log(
//           `A job named sendEmail with id: ${job.id} has completed !`,
//         );
//         await this.logEmailJob(job, 'SUCCESS', null);
//       });

//       worker.on('failed', async (job, err) => {
//         this.logger.error(
//           `A job named sendEmail with id: ${job.id} has failed with message: ${err}`,
//         );
//         await this.logEmailJob(job, 'ERROR', err);
//       });

//       return worker;
//     } catch (error) {
//       const errorMessage = `Errored while working with queued email with message: ${error}`;
//       this.logger.error(errorMessage);
//       throw errorMessage;
//     }
//   }
// }
