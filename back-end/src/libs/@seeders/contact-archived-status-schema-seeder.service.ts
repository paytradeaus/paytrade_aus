import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

/**
 * Task #274 — Ensure the `client_suppliers_details` columns introduced
 * by the Xero-archive mirror exist in production.
 *
 * Columns added:
 *   - `is_archived` (boolean, default false): set by the nightly Xero
 *     archive mirror cron when the linked `xero_contact_details` row is
 *     ARCHIVED in Xero. Hides the contact from pickers but keeps
 *     historical claims/payments intact.
 *   - `archived_at` (timestamptz, nullable): timestamp the archive flip
 *     happened, for audit / un-archive ordering.
 *   - `archived_reason` (varchar(32), nullable): why; currently always
 *     'xero_mirror' when set by the cron.
 *
 * `synchronize=false` in production means the entity decorator alone
 * won't add these columns — without this seeder the new code paths
 * would crash with `column "is_archived" does not exist`.
 *
 * Idempotent: `ADD COLUMN IF NOT EXISTS` is safe to re-run.
 */
@Injectable()
export class ContactArchivedStatusSchemaSeederService
  implements OnApplicationBootstrap
{
  private logger = new PaytradeLogger('CONTACT_ARCHIVED_STATUS_SCHEMA');

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    try {
      await this.dataSource.query(`
        ALTER TABLE client_suppliers_details
          ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
      `);
      await this.dataSource.query(`
        ALTER TABLE client_suppliers_details
          ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone NULL;
      `);
      await this.dataSource.query(`
        ALTER TABLE client_suppliers_details
          ADD COLUMN IF NOT EXISTS archived_reason varchar(32) NULL;
      `);
      // Partial index — only a small fraction of rows are archived at any
      // time, and the picker filter `WHERE is_archived = false` is the
      // hot path. Use a partial index on the archived set so unarchive
      // sweeps and mirror reconciliation are cheap.
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_client_suppliers_is_archived
          ON client_suppliers_details (company_id)
          WHERE is_archived = true;
      `);
      this.logger.log(
        'client_suppliers_details.is_archived / archived_at / archived_reason ensured (Task #274)',
      );
    } catch (error: any) {
      this.logger.error(
        `Task #274 schema seeder failed: ${error?.message || error}`,
      );
    }
  }
}
