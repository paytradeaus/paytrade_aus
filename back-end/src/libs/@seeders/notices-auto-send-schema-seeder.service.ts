import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

const ACTIVITY_TEMPLATES = [
  {
    id: 201,
    event_group: 'USER',
    event_type: 'ABA',
    event_text: 'ABA file generated',
    event_by: 'USER',
  },
  {
    id: 202,
    event_group: 'USER',
    event_type: 'NOTICE',
    event_text: 'Notice auto-sent on user behalf',
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
    for (const tpl of ACTIVITY_TEMPLATES) {
      try {
        const existing = await this.dataSource.query(
          'SELECT id FROM activity_log_templates WHERE id = $1',
          [tpl.id],
        );
        if (existing && existing.length) continue;
        await this.dataSource.query(
          `INSERT INTO activity_log_templates (id, event_group, event_type, event_text, event_by)
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
          [tpl.id, tpl.event_group, tpl.event_type, tpl.event_text, tpl.event_by],
        );
        inserted++;
      } catch (error) {
        this.logger.warn(
          `activity_log_templates: failed to insert id=${tpl.id}: ${error?.message || error}`,
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
      this.logger.log(
        `activity_log_templates: inserted ${inserted} new template(s) for ABA + notice auto-sent`,
      );
    } else {
      this.logger.log(
        'activity_log_templates: ABA + notice auto-sent templates already present',
      );
    }
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
