import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

/**
 * Task #97 — activity log templates for ABA generation, notice generation,
 * and auto-send-on-user-behalf events. Texts use the canonical `{{token}}`
 * interpolation format consumed by the activity-log renderer.
 *
 * Note: id 200 is reserved by an unrelated "Holiday added" row in the
 * existing schema, so we use 201/202/203 for this task.
 */
const ACTIVITY_TEMPLATES = [
  {
    id: 201,
    event_group: 'USER',
    event_type: 'ABA',
    event_text: 'ABA file generated for {{paymentName}}',
    event_by: 'USER',
  },
  {
    id: 202,
    event_group: 'USER',
    event_type: 'NOTICE',
    event_text: 'Notice ({{noticeType}}) auto-sent on your behalf',
    event_by: 'USER',
  },
  {
    id: 203,
    event_group: 'USER',
    event_type: 'NOTICE',
    event_text: 'Notice generated ({{noticeType}})',
    event_by: 'USER',
  },
];

@Injectable()
export class NoticesAutoSendSchemaSeederService
  implements OnApplicationBootstrap
{
  private logger = new PaytradeLogger('NOTICES_AUTO_SEND_SCHEMA');

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    await this.ensureColumn();
    await this.ensureActivityTemplates();
    await this.rewriteLegacyTokens();
  }

  private async ensureColumn() {
    try {
      await this.dataSource.query(`
        ALTER TABLE company_details
          ADD COLUMN IF NOT EXISTS notices_auto_send boolean DEFAULT NULL;
      `);
      this.logger.log('company_details.notices_auto_send column ensured');
    } catch (error) {
      this.logger.error(
        `notices_auto_send column migration failed: ${error?.message || error}`,
      );
    }
  }

  private async ensureActivityTemplates() {
    let inserted = 0;
    let updated = 0;
    for (const tpl of ACTIVITY_TEMPLATES) {
      try {
        const existing = await this.dataSource.query(
          'SELECT id, event_text FROM activity_log_templates WHERE id = $1',
          [tpl.id],
        );
        if (existing && existing.length) {
          // Keep template text in sync if it drifted from the desired
          // interpolation format (e.g. seeded with the older static text).
          if (existing[0].event_text !== tpl.event_text) {
            await this.dataSource.query(
              `UPDATE activity_log_templates
                 SET event_text = $2, event_group = $3, event_type = $4, event_by = $5
                 WHERE id = $1`,
              [tpl.id, tpl.event_text, tpl.event_group, tpl.event_type, tpl.event_by],
            );
            updated++;
          }
          continue;
        }
        await this.dataSource.query(
          `INSERT INTO activity_log_templates (id, event_group, event_type, event_text, event_by)
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
          [tpl.id, tpl.event_group, tpl.event_type, tpl.event_text, tpl.event_by],
        );
        inserted++;
      } catch (error) {
        this.logger.warn(
          `activity_log_templates: failed to upsert id=${tpl.id}: ${error?.message || error}`,
        );
      }
    }
    if (inserted > 0) {
      try {
        await this.dataSource.query(
          `SELECT setval('activity_log_templates_id_seq', (SELECT COALESCE(MAX(id), 1) FROM activity_log_templates))`,
        );
      } catch {
        // sequence may not exist on this schema; harmless
      }
    }
    this.logger.log(
      `activity_log_templates: inserted=${inserted}, updated=${updated}, total_templates=${ACTIVITY_TEMPLATES.length}`,
    );
  }

  private async rewriteLegacyTokens() {
    try {
      const result = await this.dataSource.query(
        `UPDATE activity_log_templates
           SET event_text = regexp_replace(event_text, '\\[\\{([a-zA-Z0-9_]+)\\}\\]', '{{\\1}}', 'g')
           WHERE event_text ~ '\\[\\{[a-zA-Z0-9_]+\\}\\]'`,
      );
      const count = Array.isArray(result) && result[1] ? result[1] : 0;
      if (count > 0) {
        this.logger.log(
          `activity_log_templates: rewrote legacy [{token}] -> {{token}} in ${count} row(s)`,
        );
      } else {
        this.logger.log(
          'activity_log_templates: no legacy [{token}] placeholders found',
        );
      }
    } catch (error) {
      this.logger.warn(
        `activity_log_templates token rewrite failed: ${error?.message || error}`,
      );
    }
  }
}
