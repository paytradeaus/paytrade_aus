import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

import * as emailTemplatesData from './email-templates-seed-data/email-templates.json';

/**
 * Idempotent seeder for system-managed `email_templates` rows that need to
 * exist out of the box but should remain editable from the admin UI without
 * being overwritten on subsequent boots. Mirrors the
 * `notice-templates-seeder` pattern (see docs/architecture/email-patterns.md).
 *
 * Currently seeds:
 *   - `ai_credit_topup_receipt` — Task #168 (branded Stripe top-up receipt).
 */
@Injectable()
export class EmailTemplatesSeederService implements OnApplicationBootstrap {
  private logger: PaytradeLogger;

  constructor(
    @InjectRepository(EmailTemplates)
    private templatesRepo: Repository<EmailTemplates>,
  ) {
    this.logger = new PaytradeLogger('EMAIL_TEMPLATES_SEEDER');
  }

  async onApplicationBootstrap() {
    try {
      await this.seedEmailTemplates(emailTemplatesData as any[]);
      this.logger.log('Email templates seeding complete');
    } catch (error) {
      this.logger.error(`Email templates seeding failed: ${error.message}`);
    }
  }

  private async seedEmailTemplates(seedRows: any[]) {
    let inserted = 0;
    for (const row of seedRows) {
      const exists = await this.templatesRepo.findOne({
        where: { email_type: row.email_type },
      });
      if (!exists) {
        await this.templatesRepo.save(this.templatesRepo.create(row));
        inserted++;
      }
    }
    if (inserted > 0) {
      this.logger.log(
        `email_templates: inserted ${inserted} missing rows`,
      );
    } else {
      this.logger.log(
        `email_templates: all ${seedRows.length} rows present`,
      );
    }
  }
}
