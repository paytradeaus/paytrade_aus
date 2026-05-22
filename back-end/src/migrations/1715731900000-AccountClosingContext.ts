import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Task #238 — Persist closing-context on `bank_accounts` so that the
 * QBCC TA2 (project & retention) and Contracting Party Account Closing
 * Notice generators in `notices.service.ts` can derive the right
 * before/after / scenario flags on Form TA2 without a separate
 * pipe-through param.
 *
 * Adds:
 *   - `closing_mode` enum ('Closed' | 'Transferred' | 'Renamed')
 *   - `closing_effective_date` date
 *   - `closing_previous_account_name` text  (rename: pre-rename name)
 *   - `closing_target_account_name` text    (transfer: destination)
 *   - `closing_target_financial_institution` text
 *   - `closing_target_bsb` int
 *   - `closing_target_account_number` text
 *   - `closing_target_opening_date` date
 *
 * Idempotent. Safe to re-run.
 */
export class AccountClosingContext1715731900000 implements MigrationInterface {
  name = 'AccountClosingContext1715731900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "bank_accounts_closing_mode_enum"
          AS ENUM ('Closed', 'Transferred', 'Renamed');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "bank_accounts"
        ADD COLUMN IF NOT EXISTS "closing_mode"
          "bank_accounts_closing_mode_enum",
        ADD COLUMN IF NOT EXISTS "closing_effective_date" date,
        ADD COLUMN IF NOT EXISTS "closing_previous_account_name" text,
        ADD COLUMN IF NOT EXISTS "closing_target_account_name" text,
        ADD COLUMN IF NOT EXISTS "closing_target_financial_institution" text,
        ADD COLUMN IF NOT EXISTS "closing_target_bsb" integer,
        ADD COLUMN IF NOT EXISTS "closing_target_account_number" text,
        ADD COLUMN IF NOT EXISTS "closing_target_opening_date" date;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "bank_accounts"
        DROP COLUMN IF EXISTS "closing_target_opening_date",
        DROP COLUMN IF EXISTS "closing_target_account_number",
        DROP COLUMN IF EXISTS "closing_target_bsb",
        DROP COLUMN IF EXISTS "closing_target_financial_institution",
        DROP COLUMN IF EXISTS "closing_target_account_name",
        DROP COLUMN IF EXISTS "closing_previous_account_name",
        DROP COLUMN IF EXISTS "closing_effective_date",
        DROP COLUMN IF EXISTS "closing_mode";
    `);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "bank_accounts_closing_mode_enum"`,
    );
  }
}
