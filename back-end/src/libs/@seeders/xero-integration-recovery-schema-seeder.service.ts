import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

/**
 * Task #42 — Adds the consecutive-missing-tenant counter column used by the
 * hourly Xero scheduler to avoid demoting healthy integrations to `Inactive`
 * on a single transient `/connections` failure. Idempotent — safe to re-run.
 */
@Injectable()
export class XeroIntegrationRecoverySchemaSeederService
  implements OnApplicationBootstrap
{
  private logger = new PaytradeLogger('XERO_INTEGRATION_RECOVERY_SCHEMA');

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.dataSource.query(`
        ALTER TABLE xero_integration_details
          ADD COLUMN IF NOT EXISTS consecutive_missing_tenant_count integer NOT NULL DEFAULT 0;
      `);
      this.logger.log(
        'xero_integration_details.consecutive_missing_tenant_count column ensured',
      );
    } catch (error) {
      this.logger.error(
        `xero_integration_details consecutive_missing_tenant_count migration failed: ${error.message}`,
      );
    }
  }
}
