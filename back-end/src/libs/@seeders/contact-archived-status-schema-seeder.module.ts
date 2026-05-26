import { Module } from '@nestjs/common';
import { ContactArchivedStatusSchemaSeederService } from './contact-archived-status-schema-seeder.service';

@Module({
  providers: [ContactArchivedStatusSchemaSeederService],
})
export class ContactArchivedStatusSchemaSeederModule {}
