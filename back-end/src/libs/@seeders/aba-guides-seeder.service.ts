import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlogResource } from 'src/entities/admin-blogs-resources.entity';
import { MasterTypes } from 'src/entities/master-types.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

import * as abaGuidesData from './aba-guides-seed-data/aba-guides.json';

interface AbaGuideSeed {
  title: string;
  urlSlug: string;
  category_value: string;
  tags: string[];
  content: string;
}

@Injectable()
export class AbaGuidesSeederService implements OnApplicationBootstrap {
  private logger: PaytradeLogger;

  constructor(
    @InjectRepository(BlogResource)
    private blogRepo: Repository<BlogResource>,
    @InjectRepository(MasterTypes)
    private masterTypesRepo: Repository<MasterTypes>,
  ) {
    this.logger = new PaytradeLogger('ABA_GUIDES_SEEDER');
  }

  async onApplicationBootstrap() {
    try {
      await this.seedAbaGuides(abaGuidesData as AbaGuideSeed[]);
      this.logger.log('ABA how-to guides seeding complete');
    } catch (error) {
      this.logger.error(`ABA how-to guides seeding failed: ${error.message}`);
    }
  }

  private async seedAbaGuides(seedRows: AbaGuideSeed[]) {
    let inserted = 0;
    let skipped = 0;
    for (const row of seedRows) {
      const existing = await this.blogRepo.findOne({
        where: { title: row.title },
      });
      if (existing) {
        skipped++;
        continue;
      }

      const category = await this.masterTypesRepo.findOne({
        where: {
          master_type: 'How To Guide Category',
          value: row.category_value,
        },
      });
      if (!category) {
        this.logger.warn(
          `Skipping "${row.title}" — category "${row.category_value}" not found`,
        );
        continue;
      }

      const guide = this.blogRepo.create({
        title: row.title,
        content: row.content,
        content_type: 'howToGuide',
        urlSlug: row.urlSlug,
        tags: row.tags,
        blog_status: 'Published',
        published_on: new Date(),
        enable_comments: true,
        featured: false,
        category,
        created_group: 'SYSTEM',
        updated_group: 'SYSTEM',
      });
      await this.blogRepo.save(guide);
      inserted++;
    }
    this.logger.log(
      `aba_how_to_guides: inserted ${inserted}, already-present ${skipped}, of ${seedRows.length}`,
    );
  }
}
