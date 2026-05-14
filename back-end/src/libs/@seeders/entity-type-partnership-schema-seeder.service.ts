import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

@Injectable()
export class EntityTypePartnershipSchemaSeederService
  implements OnApplicationBootstrap
{
  private logger = new PaytradeLogger('ENTITY_TYPE_PARTNERSHIP_SCHEMA');

  private readonly enumTypeNames = [
    'client_suppliers_details_entity_type_enum',
    'company_details_entity_type_enum',
  ];

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    for (const enumName of this.enumTypeNames) {
      try {
        await this.dataSource.query(
          `ALTER TYPE ${enumName} ADD VALUE IF NOT EXISTS 'Partnership'`,
        );
        this.logger.log(`Ensured 'Partnership' value on enum ${enumName}`);
      } catch (error) {
        const message = error?.message || String(error);
        if (/already exists/i.test(message)) {
          this.logger.log(
            `'Partnership' already present on enum ${enumName} (no-op)`,
          );
          continue;
        }
        if (/does not exist/i.test(message)) {
          this.logger.warn(
            `Enum ${enumName} does not exist yet — skipping (will be created by TypeORM on first sync).`,
          );
          continue;
        }
        this.logger.error(
          `Failed to add 'Partnership' to enum ${enumName}: ${message}`,
        );
      }
    }
  }
}
