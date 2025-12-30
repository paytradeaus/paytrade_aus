// import { Module } from '@nestjs/common';
// import { EmailQueueConsumer } from './consumer';
// import { EmailService } from '../email.service';
// import { EmailQueuerLogs } from 'src/entities/email-logs.entity';
// import { TypeOrmModule } from '@nestjs/typeorm';

// @Module({
//   imports: [TypeOrmModule.forFeature([EmailQueuerLogs])],
//   providers: [EmailQueueConsumer, EmailService],
// })
// export class EmailWorkerModule {
//   constructor(private consumer: EmailQueueConsumer) {}

//   async onModuleInit() {
//     const worker = await this.consumer.emailQueueConsumer();
//   }
// }
