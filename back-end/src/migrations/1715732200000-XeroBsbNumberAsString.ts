import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Task #259 — Promote the Xero-side mirror column
 * `xero_bank_account_details.bsb_number` from `integer` to `varchar(6)`
 * so a BSB like "064000" (NAB) keeps its leading zero end-to-end. Task
 * #258 already promoted the PayTrade-side columns
 * (`bank_accounts.bsb_number`, `bank_accounts.closing_target_bsb`), but
 * the Xero ingest sites were still doing `parseInt(...).slice(0,6)`
 * before storing, which silently truncated "064000" to 64000 the moment
 * it hit the mirror.
 *
 * Existing rows are back-filled with `LPAD(value::text, 6, '0')` so the
 * stored representation is canonical.
 *
 * Idempotent. Safe to re-run.
 */
export class XeroBsbNumberAsString1715732200000 implements MigrationInterface {
  name = 'XeroBsbNumberAsString1715732200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'xero_bank_account_details'
            AND column_name = 'bsb_number'
            AND data_type = 'integer'
        ) THEN
          ALTER TABLE "xero_bank_account_details"
            ALTER COLUMN "bsb_number" TYPE varchar(6)
            USING LPAD("bsb_number"::text, 6, '0');
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'xero_bank_account_details'
            AND column_name = 'bsb_number'
            AND data_type IN ('character varying', 'varchar')
        ) THEN
          ALTER TABLE "xero_bank_account_details"
            ALTER COLUMN "bsb_number" TYPE integer
            USING NULLIF("bsb_number", '')::integer;
        END IF;
      END $$;
    `);
  }
}
