import { Module } from '@nestjs/common';
import { XeroRetentionRecheckSchemaSeederService } from './xero-retention-recheck-schema-seeder.service';

@Module({
  providers: [XeroRetentionRecheckSchemaSeederService],
})
export class XeroRetentionRecheckSchemaSeederModule {}
