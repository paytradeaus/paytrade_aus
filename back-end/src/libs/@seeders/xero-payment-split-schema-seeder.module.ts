import { Module } from '@nestjs/common';
import { XeroPaymentSplitSchemaSeederService } from './xero-payment-split-schema-seeder.service';

@Module({
  providers: [XeroPaymentSplitSchemaSeederService],
})
export class XeroPaymentSplitSchemaSeederModule {}
