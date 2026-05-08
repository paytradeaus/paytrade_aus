import { Module } from '@nestjs/common';
import { XeroSyncLogsErrorCodeSchemaSeederService } from './xero-sync-logs-error-code-schema-seeder.service';

@Module({
  providers: [XeroSyncLogsErrorCodeSchemaSeederService],
})
export class XeroSyncLogsErrorCodeSchemaSeederModule {}
