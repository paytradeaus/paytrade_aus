import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Task #297 — Compliance cache freshness.
 *
 * `compliance_checkpoint` is currently only written by the 08:00 UTC cron
 * (`checkAllprojectCompliance`) and by explicit admin sync calls. User
 * actions that should clear a warning (confirm a payment, upload a
 * contract, send a notice, top up a trust account, etc.) do not invalidate
 * the cache, so the Compliance page / Projects list / Dashboard / daily
 * email keep showing stale failures until the next morning.
 *
 * This migration adds the freshness tracking columns the runtime
 * invalidator + refresh worker need:
 *
 *   - `is_stale`        true when a write has invalidated this row.
 *                       Defaulted to true for existing rows so the
 *                       read-time safety net will recompute once and then
 *                       store fresh = false.
 *   - `last_synced_at`  populated by `saveFullComplianceData` /
 *                       `syncCompliancesOfProject` so operators can see
 *                       how fresh the cached evaluation is.
 *
 * A partial index on `project_id WHERE is_stale = true` keeps the
 * "find dirty checkpoints for this project" lookup cheap even as the
 * table grows.
 *
 * Idempotent. Safe to re-run.
 */
export class ComplianceCheckpointFreshness1715732400000
  implements MigrationInterface
{
  name = 'ComplianceCheckpointFreshness1715732400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'compliance_checkpoint'
            AND column_name = 'is_stale'
        ) THEN
          ALTER TABLE "compliance_checkpoint"
            ADD COLUMN "is_stale" boolean NOT NULL DEFAULT true;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'compliance_checkpoint'
            AND column_name = 'last_synced_at'
        ) THEN
          ALTER TABLE "compliance_checkpoint"
            ADD COLUMN "last_synced_at" timestamptz NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_compliance_checkpoint_stale_project"
        ON "compliance_checkpoint" ("project_id")
        WHERE "is_stale" = true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_compliance_checkpoint_stale_project";`,
    );
    await queryRunner.query(
      `ALTER TABLE "compliance_checkpoint" DROP COLUMN IF EXISTS "last_synced_at";`,
    );
    await queryRunner.query(
      `ALTER TABLE "compliance_checkpoint" DROP COLUMN IF EXISTS "is_stale";`,
    );
  }
}
