import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

/**
 * Task #162 — Bootstrap seeder mirroring `AiChatRunFoundation1715731700000`.
 *
 * Production deploys don't auto-run TypeORM migrations, so we mirror the
 * minimum schema required for the read-only chat agent here. Idempotent:
 * uses `CREATE TABLE/TYPE/INDEX IF NOT EXISTS` everywhere.
 */
@Injectable()
export class AiChatFoundationSeederService implements OnApplicationBootstrap {
  private readonly logger = new PaytradeLogger('AI_CHAT_FOUNDATION_SEEDER');

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS "ai_conversations" (
          "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "user_id"     integer NOT NULL,
          "company_id"  integer,
          "title"       varchar(200),
          "created_on"  timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
          "updated_on"  timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
        );
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS "IX_ai_conversations_user_id"
          ON "ai_conversations" ("user_id");
        CREATE INDEX IF NOT EXISTS "IX_ai_conversations_company_id"
          ON "ai_conversations" ("company_id");
      `);

      await this.dataSource.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_type WHERE typname = 'ai_runs_status_enum'
          ) THEN
            CREATE TYPE "ai_runs_status_enum" AS ENUM
              ('running', 'completed', 'failed', 'stopped');
          END IF;
        END $$;
      `);

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS "ai_runs" (
          "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "conversation_id"     uuid,
          "user_id"             integer NOT NULL,
          "company_id"          integer,
          "status"              "ai_runs_status_enum" NOT NULL DEFAULT 'running',
          "started_at"          timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
          "ended_at"            timestamp with time zone,
          "openai_response_id"  varchar(200),
          "model"               varchar(120),
          "raw_cost_usd"        numeric(13,6) NOT NULL DEFAULT 0,
          "amount_charged_usd"  numeric(13,4) NOT NULL DEFAULT 0,
          "prompt_tokens"       integer NOT NULL DEFAULT 0,
          "completion_tokens"   integer NOT NULL DEFAULT 0,
          "total_tokens"        integer NOT NULL DEFAULT 0,
          "tool_call_count"     integer NOT NULL DEFAULT 0,
          "duration_ms"         integer,
          "error_message"       text,
          "created_on"          timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
        );
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS "IX_ai_runs_user_id" ON "ai_runs" ("user_id");
        CREATE INDEX IF NOT EXISTS "IX_ai_runs_company_id" ON "ai_runs" ("company_id");
        CREATE INDEX IF NOT EXISTS "IX_ai_runs_conversation_id"
          ON "ai_runs" ("conversation_id");
        CREATE INDEX IF NOT EXISTS "IX_ai_runs_status" ON "ai_runs" ("status");
      `);

      this.logger.log('AI chat foundation schema ensured (ai_runs, ai_conversations)');
    } catch (err) {
      this.logger.error(`Failed to ensure AI chat foundation schema: ${err}`);
    }
  }
}
