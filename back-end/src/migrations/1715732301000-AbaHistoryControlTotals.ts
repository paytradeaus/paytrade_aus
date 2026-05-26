import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Task #286 — Store the ABA file footer ("File Total" record-type-7)
 * control values on `generate_aba_file_history` at generation time so
 * the batch-summary view can independently reconcile the per-payment
 * breakdown against the bank-facing control totals and warn on
 * mismatch (suggests a row was edited/deleted post-generation).
 *
 * Columns are bigint cents to avoid float drift; nullable so older
 * (legacy) rows keep working — the summary treats NULL as "no control
 * total stored" and skips the mismatch warning.
 *
 * Idempotent. Safe to re-run.
 */
export class AbaHistoryControlTotals1715732301000
  implements MigrationInterface
{
  name = 'AbaHistoryControlTotals1715732301000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "generate_aba_file_history"
        ADD COLUMN IF NOT EXISTS "control_credit_total_cents" bigint NULL,
        ADD COLUMN IF NOT EXISTS "control_debit_total_cents" bigint NULL,
        ADD COLUMN IF NOT EXISTS "control_net_total_cents" bigint NULL,
        ADD COLUMN IF NOT EXISTS "control_record_count" integer NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "generate_aba_file_history"
        DROP COLUMN IF EXISTS "control_credit_total_cents",
        DROP COLUMN IF EXISTS "control_debit_total_cents",
        DROP COLUMN IF EXISTS "control_net_total_cents",
        DROP COLUMN IF EXISTS "control_record_count";
    `);
  }
}
