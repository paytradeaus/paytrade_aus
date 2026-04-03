import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { XeroLogTemplates } from 'src/entities/xero-log-templates.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

import * as xeroLogTemplatesData from './xero-log-templates-seed-data/xero-log-templates.json';

@Injectable()
export class XeroLogTemplatesSeederService implements OnApplicationBootstrap {
  private logger: PaytradeLogger;

  constructor(
    @InjectRepository(XeroLogTemplates)
    private repo: Repository<XeroLogTemplates>,
  ) {
    this.logger = new PaytradeLogger('XERO_LOG_TEMPLATES_SEEDER');
  }

  async onApplicationBootstrap() {
    try {
      const seedRows = xeroLogTemplatesData as any[];

      const existingIds = (await this.repo.find({ select: ['id'] })).map(
        (r) => r.id,
      );
      const existingSet = new Set(existingIds);
      const missingRows = seedRows.filter((r) => !existingSet.has(r.id));

      if (missingRows.length === 0) {
        this.logger.log(
          `xero_log_templates: all ${seedRows.length} rows present`,
        );
        return;
      }

      let inserted = 0;
      let failed = 0;
      for (const row of missingRows) {
        try {
          await this.repo
            .createQueryBuilder()
            .insert()
            .into(XeroLogTemplates)
            .values(row)
            .orIgnore()
            .execute();
          inserted++;
        } catch (err) {
          failed++;
          this.logger.warn(
            `xero_log_templates: failed to insert id=${row.id}: ${err?.message || err}`,
          );
        }
      }

      await this.repo.query(
        `SELECT setval('xero_log_templates_id_seq', (SELECT COALESCE(MAX(id), 1) FROM xero_log_templates))`,
      );

      this.logger.log(
        `xero_log_templates: inserted ${inserted}, failed ${failed}, total seed rows ${seedRows.length}`,
      );
    } catch (error) {
      this.logger.error(
        `xero_log_templates seeding failed: ${error.message}`,
      );
    }
  }
}
