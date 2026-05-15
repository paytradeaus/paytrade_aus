import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlogResource } from 'src/entities/admin-blogs-resources.entity';
import { MasterTypes } from 'src/entities/master-types.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

import * as manualXeroSyncGuidesData from './manual-xero-sync-guide-seed-data/manual-xero-sync-guides.json';

interface ManualXeroSyncGuideSeed {
  title: string;
  urlSlug: string;
  category_value: string;
  tags: string[];
  content: string;
}

@Injectable()
export class ManualXeroSyncGuideSeederService
  implements OnApplicationBootstrap
{
  private logger: PaytradeLogger;

  constructor(
    @InjectRepository(BlogResource)
    private blogRepo: Repository<BlogResource>,
    @InjectRepository(MasterTypes)
    private masterTypesRepo: Repository<MasterTypes>,
  ) {
    this.logger = new PaytradeLogger('MANUAL_XERO_SYNC_GUIDE_SEEDER');
  }

  async onApplicationBootstrap() {
    try {
      await this.seedGuides(
        manualXeroSyncGuidesData as ManualXeroSyncGuideSeed[],
      );
      this.logger.log('Manual Xero Sync how-to guides seeding complete');
    } catch (error) {
      this.logger.error(
        `Manual Xero Sync how-to guides seeding failed: ${error.message}`,
      );
    }
  }

  private async ensureCategory(value: string): Promise<MasterTypes> {
    const existing = await this.masterTypesRepo.findOne({
      where: { master_type: 'How To Guide Category', value },
    });
    if (existing) return existing;
    const created = this.masterTypesRepo.create({
      master_type: 'How To Guide Category',
      value,
      description: 'Xero integration and bank feeds setup',
      status: 'Active',
      created_group: 'SYSTEM',
      updated_group: 'SYSTEM',
    });
    const saved = await this.masterTypesRepo.save(created);
    this.logger.log(`Created missing How To Guide Category "${value}"`);
    return saved;
  }

  private async seedGuides(seedRows: ManualXeroSyncGuideSeed[]) {
    let inserted = 0;
    let updated = 0;
    let unchanged = 0;
    for (const row of seedRows) {
      const existing = await this.blogRepo.findOne({
        where: { title: row.title },
      });

      if (existing) {
        const sameContent = existing.content === row.content;
        const sameSlug = existing.urlSlug === row.urlSlug;
        const sameTags =
          JSON.stringify(existing.tags ?? []) === JSON.stringify(row.tags);
        if (sameContent && sameSlug && sameTags) {
          unchanged++;
          continue;
        }
        existing.content = row.content;
        existing.urlSlug = row.urlSlug;
        existing.tags = row.tags;
        existing.updated_group = 'SYSTEM';
        await this.blogRepo.save(existing);
        updated++;
        continue;
      }

      const category = await this.ensureCategory(row.category_value);

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
      `manual_xero_sync_how_to_guides: inserted ${inserted}, updated ${updated}, unchanged ${unchanged}, of ${seedRows.length}`,
    );
  }
}
