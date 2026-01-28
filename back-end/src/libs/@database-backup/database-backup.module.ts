import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseBackupService } from './database-backup.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [DatabaseBackupService],
  exports: [DatabaseBackupService],
})
export class DatabaseBackupModule {}
