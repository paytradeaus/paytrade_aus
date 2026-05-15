import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

/**
 * Task #154 — ensure the `client_suppliers_details` columns introduced
 * by the soft-fail-on-missing-email work exist in production.
 *
 * The new entity columns:
 *   - `needs_email` (boolean, default false): set when an inbound Xero
 *     contact import (manual / scheduler / webhook) succeeded with every
 *     mandatory field present except email. Cleared when the user later
 *     adds an email via `editClientSuppliersDetailsById`.
 *   - `pending_email_actions` (jsonb, default '[]'::jsonb): queue of
 *     smart-create-contract attempts that were blocked because the
 *     contact had no email. Replayed when the email is added.
 *
 * `synchronize=false` in production means the entity decorator change
 * alone won't create these columns — without this seeder the new code
 * paths would crash with `column "needs_email" does not exist`.
 *
 * Idempotent: `ADD COLUMN IF NOT EXISTS` is safe to re-run.
 */
@Injectable()
export class ContactNeedsEmailSchemaSeederService
  implements OnApplicationBootstrap
{
  private logger = new PaytradeLogger('CONTACT_NEEDS_EMAIL_SCHEMA');

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.dataSource.query(`
        ALTER TABLE client_suppliers_details
          ADD COLUMN IF NOT EXISTS needs_email boolean NOT NULL DEFAULT false;
      `);
      await this.dataSource.query(`
        ALTER TABLE client_suppliers_details
          ADD COLUMN IF NOT EXISTS pending_email_actions jsonb NOT NULL DEFAULT '[]'::jsonb;
      `);
      // Partial index to keep the "still waiting on email" lookup cheap
      // (only a handful of rows will ever satisfy this predicate at once).
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_client_suppliers_needs_email
          ON client_suppliers_details (id)
          WHERE needs_email = true;
      `);
      this.logger.log(
        'client_suppliers_details.needs_email and pending_email_actions columns ensured (Task #154)',
      );
    } catch (error: any) {
      this.logger.error(
        `Task #154 schema seeder failed: ${error?.message || error}`,
      );
    }
  }
}
