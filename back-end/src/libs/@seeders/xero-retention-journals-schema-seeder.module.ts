import { Module } from '@nestjs/common';
import { XeroRetentionJournalsSchemaSeederService } from './xero-retention-journals-schema-seeder.service';

@Module({
  providers: [XeroRetentionJournalsSchemaSeederService],
})
export class XeroRetentionJournalsSchemaSeederModule {}
