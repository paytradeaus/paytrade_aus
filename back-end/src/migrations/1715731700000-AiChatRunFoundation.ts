import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Task #162 — Read-only AI Chat Agent.
 *
 * Creates the minimal `ai_runs` and `ai_conversations` tables. These give
 * every chat run a stable id used by `ai_tool_calls.ai_run_id`,
 * `ai_prompt_audit.ai_run_id`, `ai_credit_ledger.ai_run_id`, and the
 * navigation event channel.
 *
 * Idempotent (IF NOT EXISTS / DO blocks).
 */
export class AiChatRunFoundation1715731700000 implements MigrationInterface {
  name = 'AiChatRunFoundation1715731700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_conversations" (
        "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"             integer NOT NULL,
        "company_id"          integer,
        "title"               varchar(200),
        "created_on"          timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
        "updated_on"          timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IX_ai_conversations_user_id"
        ON "ai_conversations" ("user_id");
      CREATE INDEX IF NOT EXISTS "IX_ai_conversations_company_id"
        ON "ai_conversations" ("company_id");
    `);

    await queryRunner.query(`
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

    await queryRunner.query(`
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
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IX_ai_runs_user_id" ON "ai_runs" ("user_id");
      CREATE INDEX IF NOT EXISTS "IX_ai_runs_company_id" ON "ai_runs" ("company_id");
      CREATE INDEX IF NOT EXISTS "IX_ai_runs_conversation_id" ON "ai_runs" ("conversation_id");
      CREATE INDEX IF NOT EXISTS "IX_ai_runs_status" ON "ai_runs" ("status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_runs"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ai_runs_status_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_conversations"`);
  }
}
