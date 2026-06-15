import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Task #368 — Permanent unmap for Xero bills/invoices and payments.
 *
 * Adds a boolean `permanently_unmapped` column to `xero_invoices_bills`
 * and `xero_payments`, mirroring the contacts implementation (Task #289).
 * A user can mark a bill/invoice or payment as deliberately excluded from
 * Xero auto-import/re-link; the inbound webhook + scheduler must respect
 * it. The existing `mapped_status` semantics are preserved (NULL still
 * means "unmapped"); `permanently_unmapped = true` is a stronger, sticky
 * form of "unmapped".
 *
 * Idempotent. Safe to re-run.
 */
export class XeroBillPaymentPermanentlyUnmapped1715732400000
  implements MigrationInterface
{
  name = 'XeroBillPaymentPermanentlyUnmapped1715732400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "xero_invoices_bills"
      ADD COLUMN IF NOT EXISTS "permanently_unmapped" boolean NOT NULL DEFAULT false;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_xero_invoices_bills_permanently_unmapped"
      ON "xero_invoices_bills" ("integration_id", "permanently_unmapped");
    `);

    await queryRunner.query(`
      ALTER TABLE "xero_payments"
      ADD COLUMN IF NOT EXISTS "permanently_unmapped" boolean NOT NULL DEFAULT false;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_xero_payments_permanently_unmapped"
      ON "xero_payments" ("integration_id", "permanently_unmapped");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_xero_payments_permanently_unmapped";
    `);
    await queryRunner.query(`
      ALTER TABLE "xero_payments"
      DROP COLUMN IF EXISTS "permanently_unmapped";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_xero_invoices_bills_permanently_unmapped";
    `);
    await queryRunner.query(`
      ALTER TABLE "xero_invoices_bills"
      DROP COLUMN IF EXISTS "permanently_unmapped";
    `);
  }
}
