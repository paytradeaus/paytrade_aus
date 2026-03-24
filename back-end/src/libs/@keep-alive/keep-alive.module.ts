import { Module } from '@nestjs/common';
import { KeepAliveService } from './keep-alive.service';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  providers: [KeepAliveService],
  exports: [KeepAliveService],
})
export class KeepAliveModule {}
