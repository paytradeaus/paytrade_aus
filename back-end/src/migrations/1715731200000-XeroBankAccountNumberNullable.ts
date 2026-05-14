import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Task #116 — Allow xero_bank_account_details.account_number to be NULL.
 *
 * Xero BANK accounts are not required to have a `bankAccountNumber`
 * (internal/clearing accounts, accounts created without BSB+number,
 * or numbers shorter than 7 digits). Forcing NOT NULL on the Xero-side
 * mirror table caused the bulk insert during the "Pending bank account
 * mapping" Import to crash with:
 *
 *   null value in column "account_number" of relation
 *   "xero_bank_account_details" violates not-null constraint
 *
 * This migration relaxes the constraint on the Xero mirror column only.
 * The PayTrade-side `bank_accounts.account_number` column is unchanged
 * and still requires a value when a real PayTrade bank account is
 * created.
 *
 * Idempotent: `ALTER COLUMN ... DROP NOT NULL` is safe to re-run on a
 * column that is already nullable.
 */
export class XeroBankAccountNumberNullable1715731200000
  implements MigrationInterface
{
  name = 'XeroBankAccountNumberNullable1715731200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "xero_bank_account_details"
        ALTER COLUMN "account_number" DROP NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-imposing NOT NULL is destructive in production: any rows
    // mirrored from Xero accounts without a bankAccountNumber would
    // need to be backfilled or deleted first. We backfill those rows
    // with an empty string so the constraint can be reinstated, then
    // re-add the NOT NULL.
    await queryRunner.query(`
      UPDATE "xero_bank_account_details"
        SET "account_number" = ''
        WHERE "account_number" IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "xero_bank_account_details"
        ALTER COLUMN "account_number" SET NOT NULL;
    `);
  }
}
