import { Module } from '@nestjs/common';
import { XeroBankAccountNumberNullableSchemaSeederService } from './xero-bank-account-number-nullable-schema-seeder.service';

@Module({
  providers: [XeroBankAccountNumberNullableSchemaSeederService],
})
export class XeroBankAccountNumberNullableSchemaSeederModule {}
