import { Module } from '@nestjs/common';
import { XeroRetentionModeSchemaSeederService } from './xero-retention-mode-schema-seeder.service';

@Module({
  providers: [XeroRetentionModeSchemaSeederService],
})
export class XeroRetentionModeSchemaSeederModule {}
