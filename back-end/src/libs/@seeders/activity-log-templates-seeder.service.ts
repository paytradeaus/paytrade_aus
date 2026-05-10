import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

import * as activityLogTemplatesData from './activity-log-templates-seed-data/activity-log-templates.json';

const SEED_COMPARE_FIELDS = [
  'event_group',
  'event_type',
  'event_text',
  'event_by',
] as const;

@Injectable()
export class ActivityLogTemplatesSeederService
  implements OnApplicationBootstrap
{
  private logger: PaytradeLogger;

  constructor(
    @InjectRepository(ActivityLogTemplates)
    private repo: Repository<ActivityLogTemplates>,
  ) {
    this.logger = new PaytradeLogger('ACTIVITY_LOG_TEMPLATES_SEEDER');
  }

  async onApplicationBootstrap() {
    try {
      const seedRows = activityLogTemplatesData as any[];

      const ids = seedRows.map((r) => r.id);
      const existingRows = await this.repo
        .createQueryBuilder('t')
        .where('t.id IN (:...ids)', { ids })
        .getMany();
      const existingMap = new Map(existingRows.map((r) => [r.id, r]));

      const missingRows = seedRows.filter((r) => !existingMap.has(r.id));
      const staleRows = seedRows.filter((r) => {
        const existing = existingMap.get(r.id);
        if (!existing) return false;
        return SEED_COMPARE_FIELDS.some(
          (f) =>
            JSON.stringify(r[f] ?? null) !==
            JSON.stringify((existing as any)[f] ?? null),
        );
      });

      if (missingRows.length === 0 && staleRows.length === 0) {
        this.logger.log(
          `activity_log_templates: all ${seedRows.length} seed rows present and up to date`,
        );
        return;
      }

      let inserted = 0;
      let insertFailed = 0;
      for (const row of missingRows) {
        try {
          await this.repo
            .createQueryBuilder()
            .insert()
            .into(ActivityLogTemplates)
            .values(row)
            .orIgnore()
            .execute();
          inserted++;
        } catch (err) {
          insertFailed++;
          this.logger.warn(
            `activity_log_templates: failed to insert id=${row.id}: ${err?.message || err}`,
          );
        }
      }

      let updated = 0;
      let updateFailed = 0;
      for (const row of staleRows) {
        try {
          const updatePayload: Record<string, any> = {};
          const existing = existingMap.get(row.id);
          for (const f of SEED_COMPARE_FIELDS) {
            if (
              JSON.stringify(row[f] ?? null) !==
              JSON.stringify((existing as any)[f] ?? null)
            ) {
              updatePayload[f] = row[f] ?? null;
            }
          }
          await this.repo.update(row.id, updatePayload);
          updated++;
          this.logger.log(
            `activity_log_templates: updated id=${row.id} fields=[${Object.keys(updatePayload).join(', ')}]`,
          );
        } catch (err) {
          updateFailed++;
          this.logger.warn(
            `activity_log_templates: failed to update id=${row.id}: ${err?.message || err}`,
          );
        }
      }

      if (missingRows.length > 0) {
        try {
          await this.repo.query(
            `SELECT setval('activity_log_templates_id_seq', (SELECT COALESCE(MAX(id), 1) FROM activity_log_templates))`,
          );
        } catch (err) {
          this.logger.warn(
            `activity_log_templates: setval failed: ${err?.message || err}`,
          );
        }
      }

      this.logger.log(
        `activity_log_templates: inserted ${inserted}${insertFailed ? ` (${insertFailed} failed)` : ''}, updated ${updated}${updateFailed ? ` (${updateFailed} failed)` : ''}, total seed rows ${seedRows.length}`,
      );
    } catch (error) {
      this.logger.error(
        `activity_log_templates seeding failed: ${error.message}`,
      );
    }
  }
}
