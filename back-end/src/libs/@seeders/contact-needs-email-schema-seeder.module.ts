import { Module } from '@nestjs/common';
import { ContactNeedsEmailSchemaSeederService } from './contact-needs-email-schema-seeder.service';

@Module({
  providers: [ContactNeedsEmailSchemaSeederService],
})
export class ContactNeedsEmailSchemaSeederModule {}
