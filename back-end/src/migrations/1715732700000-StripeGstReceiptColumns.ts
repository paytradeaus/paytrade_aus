import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stripe GST receipt columns:
 *   - subscription_details.is_gst_inclusive
 *   - subscription_transaction.stripe_tax_amount
 *   - subscription_transaction.stripe_total_excluding_tax
 *
 * Mirrors the idempotent ALTERs in
 * SubscriptionGstInclusiveSchemaSeederService so the schema-drift
 * guardrail is satisfied and a fresh DB has the columns even if the
 * bootstrap seeder hasn't run yet. IF NOT EXISTS keeps it safe to
 * re-run alongside the seeder.
 */
export class StripeGstReceiptColumns1715732700000
  implements MigrationInterface
{
  name = 'StripeGstReceiptColumns1715732700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscription_details"
         ADD COLUMN IF NOT EXISTS "is_gst_inclusive" boolean DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_transaction"
         ADD COLUMN IF NOT EXISTS "stripe_tax_amount" numeric NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_transaction"
         ADD COLUMN IF NOT EXISTS "stripe_total_excluding_tax" numeric NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscription_transaction"
         DROP COLUMN IF EXISTS "stripe_total_excluding_tax"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_transaction"
         DROP COLUMN IF EXISTS "stripe_tax_amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_details"
         DROP COLUMN IF EXISTS "is_gst_inclusive"`,
    );
  }
}
