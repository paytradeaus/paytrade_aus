import { Module } from '@nestjs/common';
import { XeroContactGstSchemaSeederService } from './xero-contact-gst-schema-seeder.service';

@Module({
  providers: [XeroContactGstSchemaSeederService],
})
export class XeroContactGstSchemaSeederModule {}
