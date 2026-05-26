import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add 'Info' to the xero_log_templates.sync_status enum.
 *
 * Background: bills/invoices that arrive from Xero with line account
 * codes outside the company's configured trust-flow accounts are not
 * real failures — they're just Xero records that don't belong in
 * PayTrade (general supplier expenses, non-trust bills, etc). Treating
 * them as Failed creates noise in the sync log and false-positive
 * "issues" badges.
 *
 * Reclassifying templates 260/261/420/421 to 'Info' lets users review
 * those entries and take action (e.g. unmap the supplier so future
 * webhooks for that contact are skipped) without polluting the failure
 * counters.
 *
 * Idempotent: ADD VALUE IF NOT EXISTS is a no-op when 'Info' is already
 * present.
 */
export class XeroLogTemplatesAddInfoStatus1715732600000
  implements MigrationInterface
{
  name = 'XeroLogTemplatesAddInfoStatus1715732600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."xero_log_templates_sync_status_enum" ADD VALUE IF NOT EXISTS 'Info'`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Postgres does not support removing enum values without
    // recreating the type. The seeder is the source of truth for which
    // templates use 'Info', and demoting them back to 'Failed' there
    // is sufficient for a logical rollback. No-op here.
  }
}
