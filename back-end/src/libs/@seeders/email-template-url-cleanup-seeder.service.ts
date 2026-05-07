import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import {
  getProductionHost,
  isProductionEnvironment,
  rewriteHostsInHtml,
} from 'src/libs/@email-services/email-url-sanitizer';

@Injectable()
export class EmailTemplateUrlCleanupSeederService
  implements OnApplicationBootstrap
{
  private logger: PaytradeLogger;

  constructor(
    @InjectRepository(EmailTemplates)
    private repo: Repository<EmailTemplates>,
  ) {
    this.logger = new PaytradeLogger('EMAIL_TEMPLATE_URL_CLEANUP');
  }

  async onApplicationBootstrap() {
    try {
      if (!isProductionEnvironment()) {
        this.logger.log('email_templates URL cleanup: skipped (non-production)');
        return;
      }

      const prod = getProductionHost();
      if (!prod) {
        this.logger.warn(
          'email_templates URL cleanup: skipped — LOG_BASE_URL is not set or is invalid; cannot determine production host.',
        );
        return;
      }

      const rows = await this.repo.find();
      let rewrittenRows = 0;
      let totalUrlsRewritten = 0;
      const allHostMappings = new Set<string>();

      await this.repo.manager.transaction(async (manager) => {
        const txRepo = manager.getRepository(EmailTemplates);
        for (const row of rows) {
          const original = row.email_content;
          if (!original || typeof original !== 'string') continue;
          const result = rewriteHostsInHtml(original, prod.scheme, prod.host);
          if (result.count === 0) continue;

          await txRepo.update(row.id, { email_content: result.rewritten });
          rewrittenRows++;
          totalUrlsRewritten += result.count;

          const hostMappings = Array.from(result.hostsRewritten)
            .map((h) => {
              allHostMappings.add(`${h} -> ${prod.host}`);
              return `${h} -> ${prod.host}`;
            })
            .join(', ');

          this.logger.log(
            `email_templates: rewrote email_type="${row.email_type}" urls=${result.count} hosts=[${hostMappings}]`,
          );
        }
      });

      if (rewrittenRows === 0) {
        this.logger.log(
          `email_templates URL cleanup: no rewrites needed (scanned ${rows.length} rows)`,
        );
      } else {
        this.logger.log(
          `email_templates URL cleanup: totals — rows changed=${rewrittenRows}, urls rewritten=${totalUrlsRewritten}, host mappings=[${Array.from(allHostMappings).join(', ')}], rows scanned=${rows.length}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `email_templates URL cleanup failed: ${error?.message || error}`,
      );
    }
  }
}
