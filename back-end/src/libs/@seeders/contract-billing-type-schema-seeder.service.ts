import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

/**
 * Adds:
 *  - contract_details.contract_billing_type (varchar(20), nullable, default 'Fixed')
 *
 * Backfills NULL values to 'Fixed' so existing contracts default to current behaviour.
 */
@Injectable()
export class ContractBillingTypeSchemaSeederService
  implements OnApplicationBootstrap
{
  private logger = new PaytradeLogger('CONTRACT_BILLING_TYPE_SCHEMA');

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.dataSource.query(`
        ALTER TABLE contract_details
          ADD COLUMN IF NOT EXISTS contract_billing_type varchar(20) DEFAULT 'Fixed';
      `);
      await this.dataSource.query(`
        UPDATE contract_details
          SET contract_billing_type = 'Fixed'
          WHERE contract_billing_type IS NULL;
      `);
      this.logger.log(
        'contract_details.contract_billing_type column ensured (default Fixed).',
      );
    } catch (error) {
      this.logger.error(
        `contract_billing_type schema migration failed: ${error.message}`,
      );
    }
  }
}
