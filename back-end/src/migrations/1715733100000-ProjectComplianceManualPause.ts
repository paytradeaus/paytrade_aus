import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Per-project manual compliance pause:
 *   - project_details.compliance_paused        (boolean, default false)
 *   - project_details.compliance_paused_reason (varchar)
 *   - project_details.compliance_paused_by     (integer — user_id)
 *   - project_details.compliance_paused_at     (timestamptz)
 *
 * When ON, compliance recompute / system-issue generation, dashboard
 * issue counting and compliance emails are suppressed for the project
 * until it is explicitly resumed (resume re-runs the full recompute).
 *
 * Mirrors the entity column defaults. IF NOT EXISTS keeps it safe to
 * re-run and idempotent against a manually-applied dev column.
 */
export class ProjectComplianceManualPause1715733100000
  implements MigrationInterface
{
  name = 'ProjectComplianceManualPause1715733100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_details"
         ADD COLUMN IF NOT EXISTS "compliance_paused" boolean DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_details"
         ADD COLUMN IF NOT EXISTS "compliance_paused_reason" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_details"
         ADD COLUMN IF NOT EXISTS "compliance_paused_by" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_details"
         ADD COLUMN IF NOT EXISTS "compliance_paused_at" timestamp with time zone`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_details" DROP COLUMN IF EXISTS "compliance_paused_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_details" DROP COLUMN IF EXISTS "compliance_paused_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_details" DROP COLUMN IF EXISTS "compliance_paused_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_details" DROP COLUMN IF EXISTS "compliance_paused"`,
    );
  }
}
