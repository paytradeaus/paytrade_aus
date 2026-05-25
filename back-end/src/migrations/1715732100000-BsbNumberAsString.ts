import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Task #258 — Store BSB numbers as `varchar(6)` strings so leading zeros
 * survive a round-trip through the database. Previously
 * `bank_accounts.bsb_number` and `bank_accounts.closing_target_bsb` were
 * `integer`, which silently dropped the leading zero on values like
 * "064000" (NAB) — they were re-padded only on read via the `padBsb6`
 * helper, but anything that bypassed that helper (raw SQL, Xero mirror
 * pushes, exports) saw the truncated 5-digit value.
 *
 * Existing rows are back-filled with `LPAD(value::text, 6, '0')` so the
 * stored representation is canonical.
 *
 * The `xero_bank_account_details.bsb_number` mirror column is
 * intentionally left as `integer` — that table tracks the Xero side and
 * is the source of the original truncation; promoting it is tracked as
 * a follow-up.
 *
 * Idempotent. Safe to re-run.
 */
export class BsbNumberAsString1715732100000 implements MigrationInterface {
  name = 'BsbNumberAsString1715732100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // bank_accounts.bsb_number → varchar(6), backfill padded
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'bank_accounts'
            AND column_name = 'bsb_number'
            AND data_type = 'integer'
        ) THEN
          ALTER TABLE "bank_accounts"
            ALTER COLUMN "bsb_number" TYPE varchar(6)
            USING LPAD("bsb_number"::text, 6, '0');
        END IF;
      END $$;
    `);

    // bank_accounts.closing_target_bsb → varchar(6), backfill padded
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'bank_accounts'
            AND column_name = 'closing_target_bsb'
            AND data_type = 'integer'
        ) THEN
          ALTER TABLE "bank_accounts"
            ALTER COLUMN "closing_target_bsb" TYPE varchar(6)
            USING LPAD("closing_target_bsb"::text, 6, '0');
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse: varchar(6) back to integer. Non-numeric values (should
    // not exist after the up migration's LPAD-of-digits backfill) would
    // fail the cast; that is acceptable for a rollback.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'bank_accounts'
            AND column_name = 'closing_target_bsb'
            AND data_type IN ('character varying', 'varchar')
        ) THEN
          ALTER TABLE "bank_accounts"
            ALTER COLUMN "closing_target_bsb" TYPE integer
            USING NULLIF("closing_target_bsb", '')::integer;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'bank_accounts'
            AND column_name = 'bsb_number'
            AND data_type IN ('character varying', 'varchar')
        ) THEN
          ALTER TABLE "bank_accounts"
            ALTER COLUMN "bsb_number" TYPE integer
            USING NULLIF("bsb_number", '')::integer;
        END IF;
      END $$;
    `);
  }
}
