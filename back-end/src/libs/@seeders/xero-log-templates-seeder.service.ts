import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { XeroLogTemplates } from 'src/entities/xero-log-templates.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

import * as xeroLogTemplatesData from './xero-log-templates-seed-data/xero-log-templates.json';

const SEED_COMPARE_FIELDS = [
  'sync_type',
  'description',
  'process',
  'sync_status',
  'from_xero',
  'error_code',
  'associated_log_ids',
] as const;

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

      const existingRows = await this.repo.find();
      const existingMap = new Map(existingRows.map((r) => [r.id, r]));

      // Union helper: for `associated_log_ids` we never want the seeder
      // to *remove* template links that exist in the DB but not in the
      // JSON (operators or migrations may have added linkages at
      // runtime). The effective seed value for that one column is
      // always Union(seed, existing).
      const effectiveSeedValue = (row: any, field: string, existing: any) => {
        if (field !== 'associated_log_ids') return row[field] ?? null;
        const fromSeed = Array.isArray(row[field]) ? row[field] : [];
        const fromExisting =
          existing && Array.isArray(existing[field]) ? existing[field] : [];
        const merged = Array.from(new Set([...fromExisting, ...fromSeed]));
        if (merged.length === 0) return null;
        // Sort numerically so the comparison below is stable and we
        // don't churn-update on every boot due to array order drift.
        merged.sort((a: number, b: number) => Number(a) - Number(b));
        return merged;
      };

      const missingRows = seedRows.filter((r) => !existingMap.has(r.id));
      const staleRows = seedRows.filter((r) => {
        const existing = existingMap.get(r.id);
        if (!existing) return false;
        return SEED_COMPARE_FIELDS.some(
          (f) =>
            JSON.stringify(effectiveSeedValue(r, f, existing)) !==
            JSON.stringify(existing[f] ?? null),
        );
      });

      if (missingRows.length === 0 && staleRows.length === 0) {
        this.logger.log(
          `xero_log_templates: all ${seedRows.length} rows present and up to date`,
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
            .into(XeroLogTemplates)
            .values(row)
            .orIgnore()
            .execute();
          inserted++;
        } catch (err) {
          insertFailed++;
          this.logger.warn(
            `xero_log_templates: failed to insert id=${row.id}: ${err?.message || err}`,
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
            const desired = effectiveSeedValue(row, f, existing);
            if (
              JSON.stringify(desired) !==
              JSON.stringify(existing[f] ?? null)
            ) {
              updatePayload[f] = desired;
            }
          }
          await this.repo.update(row.id, updatePayload);
          updated++;
          this.logger.log(
            `xero_log_templates: updated id=${row.id} fields=[${Object.keys(updatePayload).join(', ')}]`,
          );
        } catch (err) {
          updateFailed++;
          this.logger.warn(
            `xero_log_templates: failed to update id=${row.id}: ${err?.message || err}`,
          );
        }
      }

      if (missingRows.length > 0) {
        await this.repo.query(
          `SELECT setval('xero_log_templates_id_seq', (SELECT COALESCE(MAX(id), 1) FROM xero_log_templates))`,
        );
      }

      this.logger.log(
        `xero_log_templates: inserted ${inserted}${insertFailed ? ` (${insertFailed} failed)` : ''}, updated ${updated}${updateFailed ? ` (${updateFailed} failed)` : ''}, total seed rows ${seedRows.length}`,
      );
    } catch (error) {
      this.logger.error(
        `xero_log_templates seeding failed: ${error.message}`,
      );
    }
  }
}
