import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Per-keyword hero image for public /topics/[slug] landing pages:
 *   - seo_keyword.hero_image_url
 *
 * Optional override for the hero image shown on a keyword landing page. When
 * NULL the page falls back to the home hero image (/images/mockupshots.png).
 *
 * Mirrors the entity column (nullable text). IF NOT EXISTS keeps it safe to
 * re-run and idempotent against the dev synchronize column / runtime seeder.
 */
export class SeoKeywordHeroImageUrl1715733000000 implements MigrationInterface {
  name = 'SeoKeywordHeroImageUrl1715733000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "seo_keyword"
         ADD COLUMN IF NOT EXISTS "hero_image_url" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "seo_keyword"
         DROP COLUMN IF EXISTS "hero_image_url"`,
    );
  }
}
