import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

const LEGACY_PLACEHOLDER_REGEX = /\[\{\s*([a-zA-Z0-9_]+)\s*\}\]/g;

export function rewriteLegacyPlaceholders(input: string): {
  rewritten: string;
  count: number;
} {
  if (!input || typeof input !== 'string') {
    return { rewritten: input, count: 0 };
  }
  let count = 0;
  const rewritten = input.replace(LEGACY_PLACEHOLDER_REGEX, (_m, key) => {
    count++;
    return `{{${key}}}`;
  });
  return { rewritten, count };
}

@Injectable()
export class ActivityLogTemplatePlaceholderSeederService
  implements OnApplicationBootstrap
{
  private logger: PaytradeLogger;

  constructor(
    @InjectRepository(ActivityLogTemplates)
    private repo: Repository<ActivityLogTemplates>,
  ) {
    this.logger = new PaytradeLogger('ACTIVITY_LOG_TEMPLATE_PLACEHOLDER');
  }

  async onApplicationBootstrap() {
    try {
      const rows = await this.repo.find();
      let rewrittenRows = 0;
      let totalPlaceholdersRewritten = 0;

      await this.repo.manager.transaction(async (manager) => {
        const txRepo = manager.getRepository(ActivityLogTemplates);
        for (const row of rows) {
          const original = row.event_text;
          const result = rewriteLegacyPlaceholders(original);
          if (result.count === 0) continue;

          await txRepo.update(row.id, { event_text: result.rewritten });
          rewrittenRows++;
          totalPlaceholdersRewritten += result.count;

          this.logger.log(
            `activity_log_templates: rewrote id=${row.id} event_group="${row.event_group}" event_type="${row.event_type}" placeholders=${result.count}`,
          );
        }
      });

      if (rewrittenRows === 0) {
        this.logger.log(
          `activity_log_templates placeholder cleanup: no rewrites needed (scanned ${rows.length} rows)`,
        );
      } else {
        this.logger.log(
          `activity_log_templates placeholder cleanup: totals — rows changed=${rewrittenRows}, placeholders rewritten=${totalPlaceholdersRewritten}, rows scanned=${rows.length}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `activity_log_templates placeholder cleanup failed: ${error?.message || error}`,
      );
    }
  }
}
