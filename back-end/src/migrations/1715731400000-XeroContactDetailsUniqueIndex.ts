import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Task #135 — Phase 2: create the partial unique index that prevents
 * duplicate `(integration_id, contact_id)` rows from being inserted
 * again.
 *
 * Runs *after* Phase 1
 * (`1715731300000-XeroContactsDedupeAndUniqueIndex.ts`) has committed
 * its dedupe work and the conflict ledger. This split exists so that
 * mapped-vs-mapped conflict groups (which Phase 1 records but cannot
 * auto-resolve) don't roll back the entire dedupe + conflict-logging
 * transaction when the index gate fires.
 *
 * Behaviour:
 *   1. Re-check for any remaining duplicate groups. If present, raise
 *      an actionable EXCEPTION pointing the operator at
 *      `xero_contact_dedupe_conflicts` so they can resolve and re-run
 *      *this* migration alone (Phase 1's progress is already
 *      durable).
 *   2. Otherwise, create the partial unique index
 *      `UQ_xero_contact_details_integration_contact` with
 *      `WHERE contact_id IS NOT NULL`.
 */
export class XeroContactDetailsUniqueIndex1715731400000
  implements MigrationInterface
{
  name = 'XeroContactDetailsUniqueIndex1715731400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        remaining int;
        conflict_total int;
      BEGIN
        SELECT COUNT(*) INTO remaining
          FROM (
            SELECT 1
            FROM xero_contact_details
            WHERE contact_id IS NOT NULL
            GROUP BY integration_id, contact_id
            HAVING COUNT(*) > 1
          ) s;
        IF remaining > 0 THEN
          SELECT COUNT(*) INTO conflict_total
            FROM xero_contact_dedupe_conflicts
            WHERE resolved_at IS NULL;
          RAISE EXCEPTION
            '[Task #135 dedupe] Cannot create UQ_xero_contact_details_integration_contact: % duplicate (integration_id, contact_id) group(s) still present (likely mapped-vs-mapped conflicts). % unresolved conflict row(s) recorded in xero_contact_dedupe_conflicts; resolve them manually and re-run this migration only.',
            remaining, conflict_total;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_xero_contact_details_integration_contact"
        ON "xero_contact_details" ("integration_id", "contact_id")
        WHERE "contact_id" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_xero_contact_details_integration_contact";
    `);
  }
}
