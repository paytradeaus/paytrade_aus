import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NoticeTemplates } from 'src/entities/notices-templates.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

import * as noticeTemplatesData from './notice-templates-seed-data/notice-templates.json';

@Injectable()
export class NoticeTemplatesSeederService implements OnApplicationBootstrap {
  private logger: PaytradeLogger;

  constructor(
    @InjectRepository(NoticeTemplates)
    private templatesRepo: Repository<NoticeTemplates>,
  ) {
    this.logger = new PaytradeLogger('NOTICE_TEMPLATES_SEEDER');
  }

  async onApplicationBootstrap() {
    try {
      await this.seedNoticeTemplates(noticeTemplatesData as any[]);
      this.logger.log('Notice templates seeding complete');
    } catch (error) {
      this.logger.error(`Notice templates seeding failed: ${error.message}`);
    }
  }

  private async seedNoticeTemplates(seedRows: any[]) {
    let inserted = 0;
    for (const row of seedRows) {
      const exists = await this.templatesRepo.findOne({
        where: { notice_template_name: row.notice_template_name },
      });
      if (!exists) {
        await this.templatesRepo.save(this.templatesRepo.create(row));
        inserted++;
      }
    }
    if (inserted > 0) {
      this.logger.log(
        `notice_templates: inserted ${inserted} missing rows`,
      );
    } else {
      this.logger.log(
        `notice_templates: all ${seedRows.length} rows present`,
      );
    }
  }
}
