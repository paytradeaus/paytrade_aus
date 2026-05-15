import { Module } from '@nestjs/common';
import { AiSchemaBackfillSeederService } from './ai-schema-backfill-seeder.service';

@Module({
  providers: [AiSchemaBackfillSeederService],
})
export class AiSchemaBackfillSeederModule {}
