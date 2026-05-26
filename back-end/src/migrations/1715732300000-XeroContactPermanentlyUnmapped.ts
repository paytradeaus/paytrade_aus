import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Task #289 — Permanent unmap for Xero contacts.
 *
 * Adds a boolean `permanently_unmapped` column to `xero_contact_details`
 * so a user can mark a contact as deliberately excluded from Xero sync.
 * Auto-mapping (sync + webhook) and invoice/bill push must respect it;
 * the existing `mapped_status` enum semantics are preserved (NULL still
 * means "unmapped"), and `permanently_unmapped = true` is treated as a
 * stronger, sticky form of "unmapped".
 *
 * Idempotent. Safe to re-run.
 */
export class XeroContactPermanentlyUnmapped1715732300000
  implements MigrationInterface
{
  name = 'XeroContactPermanentlyUnmapped1715732300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "xero_contact_details"
      ADD COLUMN IF NOT EXISTS "permanently_unmapped" boolean NOT NULL DEFAULT false;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_xero_contact_details_permanently_unmapped"
      ON "xero_contact_details" ("integration_id", "permanently_unmapped");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_xero_contact_details_permanently_unmapped";
    `);
    await queryRunner.query(`
      ALTER TABLE "xero_contact_details"
      DROP COLUMN IF EXISTS "permanently_unmapped";
    `);
  }
}
