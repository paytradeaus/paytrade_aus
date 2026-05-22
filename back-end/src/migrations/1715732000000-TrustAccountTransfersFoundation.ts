import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Task #244 — Foundation schema for the Trust Account Transfer wizard.
 *
 * Adds:
 *   - `bank_account_transfers` table + supporting indexes.
 *   - `'Inter Trust Transfer'` value on the `payment_details.payment_type`
 *     enum (TypeORM does not support enum-value addition idempotently
 *     via schema-sync, so we do it manually with `ALTER TYPE … ADD VALUE
 *     IF NOT EXISTS`).
 *   - `payment_details.trust_account_transfer_id` (bigint, nullable) —
 *     links the money-movement leg back to its wizard record.
 *   - `payment_details.bank_transfer_reference` (text, nullable) —
 *     anti-echo / Xero matcher reference.
 *
 * Idempotent. Safe to re-run.
 *
 * NOTE: PostgreSQL only allows new values to be added to existing enums.
 * The `down` migration therefore drops the enum and recreates it
 * without the new value, which requires that no live row currently
 * carries `'Inter Trust Transfer'`. Production rollback should manually
 * settle / cancel any open transfers before running `down`.
 */
export class TrustAccountTransfersFoundation1715732000000
  implements MigrationInterface
{
  name = 'TrustAccountTransfersFoundation1715732000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Extend payment_details.payment_type enum.
    await queryRunner.query(`
      ALTER TYPE "payment_details_payment_type_enum"
        ADD VALUE IF NOT EXISTS 'Inter Trust Transfer';
    `);

    // 2. New payment_details columns for the wizard linkage.
    await queryRunner.query(`
      ALTER TABLE "payment_details"
        ADD COLUMN IF NOT EXISTS "trust_account_transfer_id" bigint,
        ADD COLUMN IF NOT EXISTS "bank_transfer_reference" text;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "idx_payment_details_trust_account_transfer_id"
        ON "payment_details" ("trust_account_transfer_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "idx_payment_details_bank_transfer_reference"
        ON "payment_details" ("bank_transfer_reference");
    `);

    // 3. Wizard state-machine table.
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "bank_account_transfers_status_enum"
          AS ENUM ('Pending', 'Confirmed', 'CutoverApplied', 'Cancelled', 'Failed');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bank_account_transfers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "transfer_id" bigserial NOT NULL,
        "company_id" integer NOT NULL,
        "source_bank_account_id" bigint NOT NULL,
        "destination_bank_account_id" bigint NOT NULL,
        "transfer_date" date NOT NULL,
        "amount" numeric(13,2) NOT NULL,
        "status" "bank_account_transfers_status_enum"
          NOT NULL DEFAULT 'Pending',
        "transfer_payment_id" bigint,
        "bank_transfer_reference" text,
        "carry_across_choices" jsonb DEFAULT '{}'::jsonb,
        "last_error" text,
        "cutover_applied_at" timestamptz,
        "created_by" integer,
        "created_on" timestamptz NOT NULL DEFAULT timezone('utc', now()),
        "updated_by" integer,
        "updated_on" timestamptz NOT NULL DEFAULT timezone('utc', now()),
        CONSTRAINT "pk_bank_account_transfers" PRIMARY KEY ("id"),
        CONSTRAINT "uq_bank_account_transfers_transfer_id"
          UNIQUE ("transfer_id")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "idx_bank_account_transfers_company_status"
        ON "bank_account_transfers" ("company_id", "status");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "idx_bank_account_transfers_source_status"
        ON "bank_account_transfers" ("source_bank_account_id", "status");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "idx_bank_account_transfers_payment_id"
        ON "bank_account_transfers" ("transfer_payment_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "idx_bank_account_transfers_bank_xfer_ref"
        ON "bank_account_transfers" ("bank_transfer_reference");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "bank_account_transfers"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "bank_account_transfers_status_enum"`,
    );
    await queryRunner.query(`
      DROP INDEX IF EXISTS
        "idx_payment_details_bank_transfer_reference";
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS
        "idx_payment_details_trust_account_transfer_id";
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_details"
        DROP COLUMN IF EXISTS "bank_transfer_reference",
        DROP COLUMN IF EXISTS "trust_account_transfer_id";
    `);
    // NOTE: PostgreSQL cannot drop a value from an enum in-place. The
    // down migration leaves 'Inter Trust Transfer' in the enum. Pin
    // that to a manual operator step if a true rollback is needed.
  }
}
