import { Module } from '@nestjs/common';
import { XeroTransferApplicationsSchemaSeederService } from './xero-transfer-applications-schema-seeder.service';

@Module({
  providers: [XeroTransferApplicationsSchemaSeederService],
})
export class XeroTransferApplicationsSchemaSeederModule {}
