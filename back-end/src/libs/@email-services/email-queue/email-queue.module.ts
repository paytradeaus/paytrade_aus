import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailQueuerLogs } from 'src/entities/email-logs.entity';
import { EmailQueueProducer } from './email-queue.producer';
import { EmailQueueConsumer } from './email-queue.consumer';
import { EmailService } from '../email.service';
import { EmailQueueEvent } from './email-queue-event';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailQueuerLogs]),
    BullModule.registerQueue({
      name: 'mailQueue',
    }),
  ],
  providers: [
    EmailQueueProducer,
    EmailQueueConsumer,
    EmailService,
    EmailQueueEvent,
  ],
})
export class EmailQueueModule {}
