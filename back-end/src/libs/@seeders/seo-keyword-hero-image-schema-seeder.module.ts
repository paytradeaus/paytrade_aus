import { Module } from '@nestjs/common';
import { SeoKeywordHeroImageSchemaSeederService } from './seo-keyword-hero-image-schema-seeder.service';

@Module({
  providers: [SeoKeywordHeroImageSchemaSeederService],
})
export class SeoKeywordHeroImageSchemaSeederModule {}
