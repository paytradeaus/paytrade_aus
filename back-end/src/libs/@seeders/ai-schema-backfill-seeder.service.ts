import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

/**
 * Backfill seeder for AI schema added by recent tasks whose TypeORM
 * migrations are not auto-run by this app (this codebase relies on
 * idempotent OnApplicationBootstrap seeders, not `migration:run`).
 *
 * Mirrors:
 *   - 1715731500000-AiToolRegistryFoundation (Task #159)
 *   - 1715731500000-AddAiPanelUserPreferences
 *   - 1715731700000-AiChatThreads (Task #176)
 *   - 1715731700000-AiCreditPurchaseCardDetails (Task #187)
 *   - 1715731800000-AiChatMessageErrorReason (Task #218)
 *   - 1715731800000-AiConversationMessages (Task #200)
 *
 * Every statement is idempotent (IF NOT EXISTS / DO blocks) and safe
 * to re-run in dev and production.
 */
@Injectable()
export class AiSchemaBackfillSeederService implements OnApplicationBootstrap {
  private readonly logger = new PaytradeLogger('AI_SCHEMA_BACKFILL');

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    await this.run('Task #159: ai_tool_registry/calls/audit + activity_log_new', () =>
      this.ensureAiToolRegistry(),
    );
    await this.run('AddAiPanelUserPreferences: user_details columns', () =>
      this.ensureUserDetailsAiColumns(),
    );
    await this.run('Task #176: ai_chat_threads + ai_chat_messages', () =>
      this.ensureAiChatThreads(),
    );
    await this.run('Task #187: ai_credit_purchases card columns', () =>
      this.ensureAiCreditPurchaseCardCols(),
    );
    await this.run('Task #218: ai_chat_messages.error_reason', () =>
      this.ensureAiChatMessageErrorReason(),
    );
    await this.run('Task #200: ai_conversation_messages', () =>
      this.ensureAiConversationMessages(),
    );
  }

  private async run(label: string, fn: () => Promise<void>) {
    try {
      await fn();
      this.logger.log(`${label}: ensured`);
    } catch (err: any) {
      this.logger.error(`${label}: failed: ${err?.message || err}`);
    }
  }

  // --- Task #159 -----------------------------------------------------------
  private async ensureAiToolRegistry() {
    await this.dataSource.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'ai_tool_registry_risk_level_enum'
        ) THEN
          CREATE TYPE "ai_tool_registry_risk_level_enum" AS ENUM
            ('read', 'low', 'medium', 'high', 'critical');
        END IF;
      END $$;
    `);
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS "ai_tool_registry" (
        "id"                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name"                 varchar(120) NOT NULL,
        "description"          text NOT NULL,
        "category"             varchar(80),
        "input_schema"         jsonb,
        "output_schema"        jsonb,
        "risk_level"           "ai_tool_registry_risk_level_enum" NOT NULL DEFAULT 'read',
        "requires_approval"    boolean NOT NULL DEFAULT false,
        "required_permissions" jsonb,
        "reversible"           boolean NOT NULL DEFAULT true,
        "revert_strategy"      text,
        "enabled"              boolean NOT NULL DEFAULT true,
        "created_on"           timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
        "updated_on"           timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
      );
    `);
    await this.dataSource.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_ai_tool_registry_name"
        ON "ai_tool_registry" ("name");
    `);

    await this.dataSource.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'ai_tool_calls_status_enum'
        ) THEN
          CREATE TYPE "ai_tool_calls_status_enum" AS ENUM
            ('success', 'error', 'denied', 'replay');
        END IF;
      END $$;
    `);
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS "ai_tool_calls" (
        "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tool_name"         varchar(120) NOT NULL,
        "input"             jsonb,
        "output"            jsonb,
        "error_message"     text,
        "error_code"        varchar(80),
        "status"            "ai_tool_calls_status_enum" NOT NULL DEFAULT 'success',
        "replay_of_call_id" uuid,
        "duration_ms"       integer,
        "user_id"           integer,
        "company_id"        integer,
        "admin_id"          integer,
        "ai_run_id"         uuid,
        "idempotency_key"   varchar(200),
        "created_on"        timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
      );
    `);
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS "IX_ai_tool_calls_tool_name"  ON "ai_tool_calls" ("tool_name");
      CREATE INDEX IF NOT EXISTS "IX_ai_tool_calls_user_id"    ON "ai_tool_calls" ("user_id");
      CREATE INDEX IF NOT EXISTS "IX_ai_tool_calls_company_id" ON "ai_tool_calls" ("company_id");
      CREATE INDEX IF NOT EXISTS "IX_ai_tool_calls_ai_run_id"  ON "ai_tool_calls" ("ai_run_id");
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_ai_tool_calls_idempotency_scope"
        ON "ai_tool_calls" ("tool_name", "user_id", "company_id", "idempotency_key")
        WHERE "idempotency_key" IS NOT NULL AND "status" = 'success';
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS "ai_prompt_audit" (
        "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "model"             varchar(120) NOT NULL,
        "request_id"        varchar(200),
        "prompt_text"       text NOT NULL,
        "response_text"     text,
        "metadata"          jsonb,
        "prompt_tokens"     integer,
        "completion_tokens" integer,
        "total_tokens"      integer,
        "duration_ms"       integer,
        "user_id"           integer,
        "company_id"        integer,
        "admin_id"          integer,
        "ai_run_id"         uuid,
        "error_message"     text,
        "created_on"        timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
      );
    `);
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS "IX_ai_prompt_audit_user_id"    ON "ai_prompt_audit" ("user_id");
      CREATE INDEX IF NOT EXISTS "IX_ai_prompt_audit_company_id" ON "ai_prompt_audit" ("company_id");
      CREATE INDEX IF NOT EXISTS "IX_ai_prompt_audit_ai_run_id"  ON "ai_prompt_audit" ("ai_run_id");
    `);

    await this.dataSource.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'activity_log_new'
        ) THEN
          IF NOT EXISTS (
            SELECT 1 FROM pg_type WHERE typname = 'activity_log_new_actor_mode_enum'
          ) THEN
            CREATE TYPE "activity_log_new_actor_mode_enum" AS ENUM
              ('human', 'ai_delegate', 'system');
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'activity_log_new' AND column_name = 'actor_mode'
          ) THEN
            ALTER TABLE "activity_log_new"
              ADD COLUMN "actor_mode" "activity_log_new_actor_mode_enum"
              NOT NULL DEFAULT 'human';
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'activity_log_new' AND column_name = 'ai_run_id'
          ) THEN
            ALTER TABLE "activity_log_new" ADD COLUMN "ai_run_id" uuid;
          END IF;
        END IF;
      END $$;
    `);
  }

  // --- AddAiPanelUserPreferences ------------------------------------------
  private async ensureUserDetailsAiColumns() {
    await this.dataSource.query(`
      ALTER TABLE "user_details"
        ADD COLUMN IF NOT EXISTS "ai_live_follow_enabled" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "ai_live_follow_enabled_at" timestamp with time zone NULL,
        ADD COLUMN IF NOT EXISTS "ui_preferences" json NULL;
    `);
  }

  // --- Task #176 -----------------------------------------------------------
  private async ensureAiChatThreads() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS "ai_chat_threads" (
        "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"          integer NOT NULL,
        "company_id"       integer,
        "title"            varchar(200) NOT NULL DEFAULT 'New chat',
        "last_message_at"  timestamp with time zone,
        "message_count"    integer NOT NULL DEFAULT 0,
        "created_on"       timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
        "updated_on"       timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
      );
    `);
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS "IX_ai_chat_threads_user_id"             ON "ai_chat_threads" ("user_id");
      CREATE INDEX IF NOT EXISTS "IX_ai_chat_threads_company_id"          ON "ai_chat_threads" ("company_id");
      CREATE INDEX IF NOT EXISTS "IX_ai_chat_threads_user_last_message"   ON "ai_chat_threads" ("user_id", "last_message_at");
    `);
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS "ai_chat_messages" (
        "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "thread_id"    uuid NOT NULL,
        "role"         varchar(20) NOT NULL,
        "content"      text NOT NULL,
        "status"       varchar(40),
        "page_context" jsonb,
        "created_on"   timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
      );
    `);
    await this.dataSource.query(`
      ALTER TABLE "ai_chat_messages"
        ADD COLUMN IF NOT EXISTS "page_context" jsonb;
    `);
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS "IX_ai_chat_messages_thread_id"      ON "ai_chat_messages" ("thread_id");
      CREATE INDEX IF NOT EXISTS "IX_ai_chat_messages_thread_created" ON "ai_chat_messages" ("thread_id", "created_on");
    `);
  }

  // --- Task #187 -----------------------------------------------------------
  private async ensureAiCreditPurchaseCardCols() {
    await this.dataSource.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_credit_purchases'
        ) THEN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'ai_credit_purchases' AND column_name = 'card_brand'
          ) THEN
            ALTER TABLE "ai_credit_purchases" ADD COLUMN "card_brand" varchar(32) NULL;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'ai_credit_purchases' AND column_name = 'card_last4'
          ) THEN
            ALTER TABLE "ai_credit_purchases" ADD COLUMN "card_last4" varchar(8) NULL;
          END IF;
        END IF;
      END $$;
    `);
  }

  // --- Task #218 -----------------------------------------------------------
  private async ensureAiChatMessageErrorReason() {
    await this.dataSource.query(`
      ALTER TABLE "ai_chat_messages"
        ADD COLUMN IF NOT EXISTS "error_reason" varchar(240);
    `);
  }

  // --- Task #200 -----------------------------------------------------------
  private async ensureAiConversationMessages() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS "ai_conversation_messages" (
        "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "conversation_id"  uuid NOT NULL,
        "run_id"           uuid,
        "role"             varchar(20) NOT NULL,
        "content"          text NOT NULL,
        "status"           varchar(40),
        "page_context"     jsonb,
        "created_on"       timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
      );
    `);
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS "IX_ai_conversation_messages_conversation_id"
        ON "ai_conversation_messages" ("conversation_id");
      CREATE INDEX IF NOT EXISTS "IX_ai_conversation_messages_conv_created"
        ON "ai_conversation_messages" ("conversation_id", "created_on");
    `);
  }
}
