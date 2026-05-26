import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Compliance checkpoint dedupe + unique constraint.
 *
 * Background: the auto-populate path in `getComplianceData` calls
 * `syncCompliancesOfProject` (delete-then-insert per check) without any
 * concurrency guard. When several requests for the same project arrive
 * concurrently while the table is empty for that project, each request
 * races through the loop and inserts its own row for the same
 * `(project_id, bank_account_type, check_number)` tuple, producing
 * duplicates that the daily cleanup never removes (they all match
 * `validIncomingCheckpoints`).
 *
 * This migration:
 *   1. Collapses any existing duplicates per
 *      `(project_id, bank_account_type, check_number)`, keeping the row
 *      with the most recent `last_synced_at` (NULLS LAST) and falling
 *      back to highest `id`. Rules attached to losing checkpoints are
 *      deleted first to satisfy the FK.
 *   2. Adds a unique constraint on the tuple so future races fail loud
 *      at the DB layer instead of accumulating duplicates.
 *
 * Idempotent. Safe to re-run.
 */
export class ComplianceCheckpointDedupeAndUniqueIndex1715732500000
  implements MigrationInterface
{
  name = 'ComplianceCheckpointDedupeAndUniqueIndex1715732500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: identify losing duplicate checkpoint ids.
    // We rank rows within each tuple by freshness, then drop everything
    // beyond the first.
    await queryRunner.query(`
      WITH ranked AS (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY project_id, bank_account_type, check_number
            ORDER BY last_synced_at DESC NULLS LAST, id DESC
          ) AS rn
        FROM "compliance_checkpoint"
      ),
      losers AS (
        SELECT id FROM ranked WHERE rn > 1
      )
      DELETE FROM "compliance_rule"
      WHERE checkpoint_id IN (SELECT id FROM losers);
    `);

    await queryRunner.query(`
      WITH ranked AS (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY project_id, bank_account_type, check_number
            ORDER BY last_synced_at DESC NULLS LAST, id DESC
          ) AS rn
        FROM "compliance_checkpoint"
      )
      DELETE FROM "compliance_checkpoint"
      WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
    `);

    // Step 2: add the unique constraint. Use a unique INDEX (not a
    // table constraint) so we can use `IF NOT EXISTS` and keep the
    // migration idempotent.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "UQ_compliance_checkpoint_project_bank_check"
        ON "compliance_checkpoint"
        ("project_id", "bank_account_type", "check_number");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_compliance_checkpoint_project_bank_check";`,
    );
  }
}
