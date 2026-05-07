import { Module } from '@nestjs/common';
import { XeroIntegrationRecoverySchemaSeederService } from './xero-integration-recovery-schema-seeder.service';

@Module({
  providers: [XeroIntegrationRecoverySchemaSeederService],
})
export class XeroIntegrationRecoverySchemaSeederModule {}
