import { Module } from '@nestjs/common';
import { XeroVariableBillCodeSchemaSeederService } from './xero-variable-bill-code-schema-seeder.service';

@Module({
  providers: [XeroVariableBillCodeSchemaSeederService],
})
export class XeroVariableBillCodeSchemaSeederModule {}
