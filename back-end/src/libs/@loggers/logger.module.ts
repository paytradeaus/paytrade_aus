import { Module } from '@nestjs/common';
import { PaytradeLogger } from './logger.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [PaytradeLogger, String],
  exports: [PaytradeLogger],
})
export class PaytradeLoggerModule {}
