import { Module } from '@nestjs/common';
import { ContractBillingTypeSchemaSeederService } from './contract-billing-type-schema-seeder.service';

@Module({
  providers: [ContractBillingTypeSchemaSeederService],
})
export class ContractBillingTypeSchemaSeederModule {}
