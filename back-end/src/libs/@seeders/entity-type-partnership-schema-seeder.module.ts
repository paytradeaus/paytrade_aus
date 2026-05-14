import { Module } from '@nestjs/common';
import { EntityTypePartnershipSchemaSeederService } from './entity-type-partnership-schema-seeder.service';

@Module({
  providers: [EntityTypePartnershipSchemaSeederService],
})
export class EntityTypePartnershipSchemaSeederModule {}
