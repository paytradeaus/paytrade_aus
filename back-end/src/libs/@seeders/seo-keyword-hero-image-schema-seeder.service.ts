import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

/**
 * Ensure the `seo_keyword.hero_image_url` column exists in production.
 *
 * New entity column:
 *   - `hero_image_url` (text, nullable): optional hero image shown on the
 *     public /topics/[slug] landing page. When empty the page falls back to
 *     the home hero image (/images/mockupshots.png).
 *
 * `synchronize=false` in production means the entity decorator change alone
 * won't create this column — without this seeder the SEO keyword save/read
 * paths would crash with `column "hero_image_url" does not exist`.
 *
 * Idempotent: `ADD COLUMN IF NOT EXISTS` is safe to re-run.
 */
@Injectable()
export class SeoKeywordHeroImageSchemaSeederService
  implements OnApplicationBootstrap
{
  private logger = new PaytradeLogger('SEO_KEYWORD_HERO_IMAGE_SCHEMA');

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.dataSource.query(`
        ALTER TABLE seo_keyword
          ADD COLUMN IF NOT EXISTS hero_image_url text NULL;
      `);
      this.logger.log('seo_keyword.hero_image_url column ensured');
    } catch (error: any) {
      this.logger.error(
        `seo_keyword hero image schema seeder failed: ${error?.message || error}`,
      );
    }
  }
}
