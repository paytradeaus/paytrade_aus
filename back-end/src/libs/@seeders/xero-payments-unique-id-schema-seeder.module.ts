import { Module } from '@nestjs/common';
import { XeroPaymentsUniqueIdSchemaSeederService } from './xero-payments-unique-id-schema-seeder.service';

@Module({
  providers: [XeroPaymentsUniqueIdSchemaSeederService],
})
export class XeroPaymentsUniqueIdSchemaSeederModule {}
