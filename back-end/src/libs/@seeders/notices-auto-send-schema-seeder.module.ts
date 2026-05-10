import { Module } from '@nestjs/common';
import { NoticesAutoSendSchemaSeederService } from './notices-auto-send-schema-seeder.service';

@Module({
  providers: [NoticesAutoSendSchemaSeederService],
  exports: [NoticesAutoSendSchemaSeederService],
})
export class NoticesAutoSendSchemaSeederModule {}
