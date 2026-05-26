import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Task #286 — Join table for ABA batch ↔ sub-payment membership.
 *
 * Replaces the earlier `sub_payments.aba_history_id` single-FK
 * approach (kept on the row for backward compat but no longer
 * authoritative). A sub-payment can legitimately appear in more than
 * one ABA batch when an operator regenerates a file without marking
 * the previous batch as paid; the single FK lost the older membership
 * on re-link and caused the new batch summary to show the wrong
 * count/total.
 *
 * Composite PK (aba_history_id, sub_payment_id) makes inserts
 * idempotent and guarantees a sub-payment is recorded at most once
 * per batch. FK cascades match the original FK on the column.
 *
 * Idempotent. Safe to re-run.
 */
export class AbaBatchSubPaymentsJoinTable1715732302000
  implements MigrationInterface
{
  name = 'AbaBatchSubPaymentsJoinTable1715732302000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "aba_batch_sub_payments" (
        "aba_history_id" uuid NOT NULL,
        "sub_payment_id" bigint NOT NULL,
        "created_on" timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
        CONSTRAINT "PK_aba_batch_sub_payments"
          PRIMARY KEY ("aba_history_id", "sub_payment_id"),
        CONSTRAINT "FK_abp_aba_history_id"
          FOREIGN KEY ("aba_history_id")
          REFERENCES "generate_aba_file_history"("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_abp_sub_payment_id"
          FOREIGN KEY ("sub_payment_id")
          REFERENCES "sub_payments"("sub_payment_id")
          ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_abp_sub_payment_id"
        ON "aba_batch_sub_payments" ("sub_payment_id");
    `);

    // Backfill from the legacy single-FK column so summaries continue
    // to work for batches generated between the first Task #286
    // migration and this one (typically only dev/staging).
    await queryRunner.query(`
      INSERT INTO "aba_batch_sub_payments" ("aba_history_id", "sub_payment_id")
      SELECT "aba_history_id", "sub_payment_id"
      FROM "sub_payments"
      WHERE "aba_history_id" IS NOT NULL
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_abp_sub_payment_id";`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "aba_batch_sub_payments";`,
    );
  }
}
