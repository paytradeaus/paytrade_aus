import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

/**
 * Phase 3 — Auto gross-up retention journals.
 *
 * Adds:
 *   1. xero_integration_details.auto_gross_up_retention_journals (boolean,
 *      default false). Only meaningful when simplified_retention_accounting=false
 *      AND retention_recording_mode='ex_gst'.
 *   2. xero_retention_journals link table tracking every Manual Journal that
 *      PayTrade has posted (or voided) on the user's Xero org for the purpose
 *      of grossing up retention by GST. The unique index on manual_journal_id
 *      provides the anti-echo lookup used by the MANUALJOURNAL webhook.
 */
@Injectable()
export class XeroRetentionJournalsSchemaSeederService
  implements OnApplicationBootstrap
{
  private logger = new PaytradeLogger('XERO_RETENTION_JOURNALS_SCHEMA');

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.dataSource.query(`
        ALTER TABLE xero_integration_details
          ADD COLUMN IF NOT EXISTS auto_gross_up_retention_journals
            boolean DEFAULT false;
      `);
      await this.dataSource.query(`
        UPDATE xero_integration_details
          SET auto_gross_up_retention_journals = false
          WHERE auto_gross_up_retention_journals IS NULL;
      `);

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS xero_retention_journals (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          integration_id integer NOT NULL,
          tenant_id uuid,
          pt_claim_id integer,
          pt_retention_id integer,
          pt_sub_payment_id integer,
          invoice_id uuid,
          manual_journal_id uuid,
          kind varchar(32) NOT NULL,
          status varchar(16) NOT NULL DEFAULT 'POSTED',
          retention_ex_gst numeric(18, 2),
          gst_amount numeric(18, 2),
          resolved_tax_type varchar(64),
          resolution_source varchar(64),
          narration varchar(1024),
          account_1_code varchar(64),
          account_2_code varchar(64),
          deep_link_url varchar(1024),
          error_text text,
          created_on timestamp without time zone DEFAULT now(),
          created_by integer,
          created_group varchar(32) DEFAULT 'SYSTEM',
          updated_on timestamp without time zone,
          updated_by integer,
          updated_group varchar(32)
        );
      `);

      // Backfill columns on existing tables (no-op if they already exist).
      await this.dataSource.query(`
        ALTER TABLE xero_retention_journals
          ADD COLUMN IF NOT EXISTS account_1_code varchar(64),
          ADD COLUMN IF NOT EXISTS account_2_code varchar(64),
          ADD COLUMN IF NOT EXISTS deep_link_url varchar(1024);
      `);

      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_xero_retention_journals_claim
          ON xero_retention_journals (integration_id, pt_claim_id);
      `);
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_xero_retention_journals_manual_journal_id
          ON xero_retention_journals (manual_journal_id)
          WHERE manual_journal_id IS NOT NULL;
      `);

      // Lifecycle FK to xero_integration_details. ON DELETE CASCADE so
      // disconnecting the Xero integration cleans up the journal log.
      // Wrapped in DO block so re-runs are idempotent.
      await this.dataSource.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_xero_retention_journals_integration'
          ) THEN
            ALTER TABLE xero_retention_journals
              ADD CONSTRAINT fk_xero_retention_journals_integration
              FOREIGN KEY (integration_id)
              REFERENCES xero_integration_details (integration_id)
              ON DELETE CASCADE;
          END IF;
        END$$;
      `);

      this.logger.log(
        'xero_integration_details.auto_gross_up_retention_journals + xero_retention_journals ensured',
      );
    } catch (error) {
      this.logger.error(
        `xero_retention_journals schema migration failed: ${error.message}`,
      );
    }
  }
}
