import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

/**
 * User-driven archive feature for the Xero Sync Log table.
 *
 * Adds three nullable columns to xero_sync_logs:
 *   - archived_at         — timestamp when the user archived the row
 *   - archived_by_user_id — user_details.id who archived it
 *   - archive_note        — optional free-text note left by the user
 *
 * Rows where archived_at IS NOT NULL are excluded from the default
 * Synced / Warning / Issues counters and table view, but remain in the
 * database for audit. A dedicated "Archived" filter in the UI lets
 * users review and un-archive them.
 *
 * Idempotent — safe to re-run on dev/staging/production.
 */
@Injectable()
export class XeroSyncLogsArchiveSchemaSeederService
  implements OnApplicationBootstrap
{
  private logger = new PaytradeLogger('XERO_SYNC_LOGS_ARCHIVE_SCHEMA');

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.dataSource.query(`
        ALTER TABLE xero_sync_logs
          ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL,
          ADD COLUMN IF NOT EXISTS archived_by_user_id integer NULL,
          ADD COLUMN IF NOT EXISTS archive_note varchar NULL;
      `);
      // Partial index on archived_at NULL — the dominant query path
      // (active sync log list + counters) always filters
      // archived_at IS NULL, so this keeps lookups O(active rows).
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_xero_sync_logs_active
          ON xero_sync_logs (integration_id, log_template_id)
          WHERE archived_at IS NULL;
      `);
      this.logger.log(
        'xero_sync_logs archive columns + idx_xero_sync_logs_active ensured',
      );
    } catch (error: any) {
      this.logger.error(
        `xero_sync_logs archive migration failed: ${error?.message || error}`,
      );
    }
  }
}
