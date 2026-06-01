import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

/**
 * Consumption ledger for inbound Xero BankTransfers.
 *
 * Creates `xero_transfer_applications`, which tracks how much of each Xero
 * BankTransfer has been applied to each PayTrade payment. This enables BULK
 * (1 transfer -> N retentions) and SPLIT (N transfers -> 1 retention)
 * matching with accumulate-then-tick, and guarantees no transfer's dollars
 * are applied twice (unique transfer+payment pair).
 */
@Injectable()
export class XeroTransferApplicationsSchemaSeederService
  implements OnApplicationBootstrap
{
  private logger = new PaytradeLogger('XERO_TRANSFER_APPLICATIONS_SCHEMA');

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS xero_transfer_applications (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          integration_id integer NOT NULL,
          tenant_id uuid,
          bank_transfer_id uuid NOT NULL,
          pt_payment_id integer NOT NULL,
          kind varchar(32) NOT NULL,
          amount_applied numeric(18, 2) NOT NULL,
          notes varchar(1024),
          created_on timestamp without time zone DEFAULT now(),
          created_by integer,
          created_group varchar(32) DEFAULT 'SYSTEM',
          updated_on timestamp without time zone,
          updated_by integer,
          updated_group varchar(32)
        );
      `);

      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_xero_transfer_applications_transfer
          ON xero_transfer_applications (integration_id, bank_transfer_id);
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_xero_transfer_applications_payment
          ON xero_transfer_applications (integration_id, pt_payment_id);
      `);
      // A given transfer may only be applied to a given payment once. A
      // transfer can still be applied to many payments (BULK) and a payment
      // can still be covered by many transfers (SPLIT) — only the exact
      // (transfer, payment) pair is unique, which is the double-apply guard.
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_xero_transfer_applications_transfer_payment
          ON xero_transfer_applications (bank_transfer_id, pt_payment_id);
      `);

      // Lifecycle FK to xero_integration_details. ON DELETE CASCADE so
      // disconnecting the Xero integration cleans up the ledger. Wrapped in
      // a DO block so re-runs are idempotent.
      await this.dataSource.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_xero_transfer_applications_integration'
          ) THEN
            ALTER TABLE xero_transfer_applications
              ADD CONSTRAINT fk_xero_transfer_applications_integration
              FOREIGN KEY (integration_id)
              REFERENCES xero_integration_details (integration_id)
              ON DELETE CASCADE;
          END IF;
        END$$;
      `);

      this.logger.log('xero_transfer_applications ensured');
    } catch (error) {
      this.logger.error(
        `xero_transfer_applications schema migration failed: ${error.message}`,
      );
    }
  }
}
