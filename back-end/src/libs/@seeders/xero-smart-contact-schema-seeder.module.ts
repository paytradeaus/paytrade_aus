import { Module } from '@nestjs/common';
import { XeroSmartContactSchemaSeederService } from './xero-smart-contact-schema-seeder.service';

@Module({
  providers: [XeroSmartContactSchemaSeederService],
})
export class XeroSmartContactSchemaSeederModule {}
