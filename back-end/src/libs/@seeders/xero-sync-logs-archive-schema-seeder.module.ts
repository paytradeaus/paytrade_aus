import { Module } from '@nestjs/common';
import { XeroSyncLogsArchiveSchemaSeederService } from './xero-sync-logs-archive-schema-seeder.service';

@Module({
  providers: [XeroSyncLogsArchiveSchemaSeederService],
})
export class XeroSyncLogsArchiveSchemaSeederModule {}
