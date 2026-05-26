import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Task #286 — Persist the link from an ABA batch
 * (`generate_aba_file_history`) back to the sub-payments that were
 * included in it, so the "View" action on the ABA History tab can
 * render a proper batch summary (count, total, per-line breakdown)
 * instead of opening the raw `.aba` file.
 *
 * Adds a nullable `aba_history_id` (uuid) column + FK on
 * `sub_payments`. New ABA generations populate it inline. Existing
 * (legacy) rows are left NULL on purpose — reconstructing the exact
 * batch membership from the on-disk `.aba` file is not deterministic
 * from SQL alone (timing + amount collisions), so the summary view
 * falls back to a "breakdown unavailable for this legacy batch"
 * message for those rows. The download action remains unchanged so
 * the raw file is still reachable for audit.
 *
 * Idempotent. Safe to re-run.
 */
export class AbaHistorySubPaymentLink1715732300000
  implements MigrationInterface
{
  name = 'AbaHistorySubPaymentLink1715732300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'sub_payments'
            AND column_name = 'aba_history_id'
        ) THEN
          ALTER TABLE "sub_payments"
            ADD COLUMN "aba_history_id" uuid NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_sub_payments_aba_history_id'
        ) THEN
          ALTER TABLE "sub_payments"
            ADD CONSTRAINT "FK_sub_payments_aba_history_id"
            FOREIGN KEY ("aba_history_id")
            REFERENCES "generate_aba_file_history"("id")
            ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sub_payments_aba_history_id"
        ON "sub_payments" ("aba_history_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_sub_payments_aba_history_id";`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_sub_payments_aba_history_id'
        ) THEN
          ALTER TABLE "sub_payments"
            DROP CONSTRAINT "FK_sub_payments_aba_history_id";
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE "sub_payments" DROP COLUMN IF EXISTS "aba_history_id";
    `);
  }
}
