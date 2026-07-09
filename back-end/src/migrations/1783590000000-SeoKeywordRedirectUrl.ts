import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Optional redirect for public /topics/[slug] landing pages:
 *   - seo_keyword.redirect_url
 *
 * When NULL/empty the landing page renders normally. When set, visiting
 * /topics/[slug] redirects to the specified URL (relative path or absolute
 * URL). Used to consolidate near-duplicate keyword pages onto canonical hubs
 * without deleting the keyword record.
 *
 * IF NOT EXISTS keeps it safe to re-run and idempotent against the dev
 * synchronize column.
 */
export class SeoKeywordRedirectUrl1783590000000 implements MigrationInterface {
  name = 'SeoKeywordRedirectUrl1783590000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "seo_keyword"
         ADD COLUMN IF NOT EXISTS "redirect_url" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "seo_keyword"
         DROP COLUMN IF EXISTS "redirect_url"`,
    );
  }
}
