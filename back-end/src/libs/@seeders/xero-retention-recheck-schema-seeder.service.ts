import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

/**
 * Task #53 — Catch up on legacy unmatched retention transfers.
 *
 * Adds the per-company feature flag column
 * `xero_integration_details.auto_recheck_unmatched_retention_transfers`
 * (boolean, default true). When false the daily retro re-check cron in
 * XeroSchedulerService skips that company.
 *
 * Idempotent — safe to re-run on production where synchronize=false.
 */
@Injectable()
export class XeroRetentionRecheckSchemaSeederService
  implements OnApplicationBootstrap
{
  private logger = new PaytradeLogger('XERO_RETENTION_RECHECK_SCHEMA');

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.dataSource.query(`
        ALTER TABLE xero_integration_details
          ADD COLUMN IF NOT EXISTS auto_recheck_unmatched_retention_transfers
          boolean DEFAULT true;
      `);
      this.logger.log(
        'xero_integration_details.auto_recheck_unmatched_retention_transfers ensured',
      );
    } catch (error: any) {
      this.logger.error(
        `xero_integration_details retro re-check column migration failed: ${error?.message || error}`,
      );
    }
  }
}
