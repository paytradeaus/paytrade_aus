import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

/**
 * Hardening — DB-level uniqueness for active Xero payments.
 *
 * Rationale:
 *   `processPayment` already does an idempotency `findOne` on
 *   (payment_id, integration_id) before inserting into xero_payments,
 *   but with the manual-sync inline payment walk now running in the
 *   same window as the (eventually-fixed) wait-queue worker and
 *   inbound webhook fan-out, two code paths can race to insert the
 *   same Xero PaymentID for the same integration. Add a partial
 *   unique index that excludes DELETED rows — Xero treats DELETED
 *   as a tombstone and we want to allow re-insertion of a fresh
 *   payment whose PaymentID happened to be reused (extremely rare
 *   but the SDK allows it).
 *
 * Idempotent — safe to re-run on production where synchronize=false.
 */
@Injectable()
export class XeroPaymentsUniqueIdSchemaSeederService
  implements OnApplicationBootstrap
{
  private logger = new PaytradeLogger('XERO_PAYMENTS_UNIQUE_ID_SCHEMA');

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    try {
      const dupes = await this.dataSource.query(`
        SELECT integration_id, payment_id, COUNT(*) AS c
        FROM xero_payments
        WHERE payment_id IS NOT NULL
          AND status IS DISTINCT FROM 'DELETED'
        GROUP BY integration_id, payment_id
        HAVING COUNT(*) > 1
        LIMIT 5;
      `);
      if (dupes && dupes.length > 0) {
        this.logger.error(
          `Skipping unique index — ${dupes.length} duplicate (integration_id,payment_id) pair(s) detected on active xero_payments rows. Sample: ${JSON.stringify(
            dupes,
          )}. Resolve manually before re-running.`,
        );
        return;
      }

      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_xero_payments_active_payment_id
          ON xero_payments (integration_id, payment_id)
          WHERE payment_id IS NOT NULL
            AND status IS DISTINCT FROM 'DELETED';
      `);
      this.logger.log(
        'uq_xero_payments_active_payment_id ensured (partial unique on (integration_id, payment_id) WHERE active)',
      );
    } catch (error: any) {
      this.logger.error(
        `xero_payments unique-id schema migration failed: ${error?.message || error}`,
      );
    }
  }
}
