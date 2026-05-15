import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Task #159 — Creates `ai_tool_registry`, `ai_tool_calls`,
 * `ai_prompt_audit`, and adds `actor_mode` + `ai_run_id` to
 * `activity_log_new`. Idempotent (IF NOT EXISTS / DO blocks) so it
 * applies cleanly to dev (synchronize) and production.
 */
export class AiToolRegistryFoundation1715731500000
  implements MigrationInterface
{
  name = 'AiToolRegistryFoundation1715731500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- ai_tool_registry --------------------------------------------------
    await queryRunner.query(`
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

    await queryRunner.query(`
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

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_ai_tool_registry_name"
        ON "ai_tool_registry" ("name");
    `);

    // --- ai_tool_calls -----------------------------------------------------
    await queryRunner.query(`
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

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_tool_calls" (
        "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tool_name"       varchar(120) NOT NULL,
        "input"           jsonb,
        "output"          jsonb,
        "error_message"   text,
        "error_code"      varchar(80),
        "status"          "ai_tool_calls_status_enum" NOT NULL DEFAULT 'success',
        "replay_of_call_id" uuid,
        "duration_ms"     integer,
        "user_id"         integer,
        "company_id"      integer,
        "admin_id"        integer,
        "ai_run_id"       uuid,
        "idempotency_key" varchar(200),
        "created_on"      timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IX_ai_tool_calls_tool_name"
        ON "ai_tool_calls" ("tool_name");
      CREATE INDEX IF NOT EXISTS "IX_ai_tool_calls_user_id"
        ON "ai_tool_calls" ("user_id");
      CREATE INDEX IF NOT EXISTS "IX_ai_tool_calls_company_id"
        ON "ai_tool_calls" ("company_id");
      CREATE INDEX IF NOT EXISTS "IX_ai_tool_calls_ai_run_id"
        ON "ai_tool_calls" ("ai_run_id");
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_ai_tool_calls_idempotency_scope"
        ON "ai_tool_calls" ("tool_name", "user_id", "company_id", "idempotency_key")
        WHERE "idempotency_key" IS NOT NULL AND "status" = 'success';
    `);

    // --- ai_prompt_audit ---------------------------------------------------
    await queryRunner.query(`
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

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IX_ai_prompt_audit_user_id"
        ON "ai_prompt_audit" ("user_id");
      CREATE INDEX IF NOT EXISTS "IX_ai_prompt_audit_company_id"
        ON "ai_prompt_audit" ("company_id");
      CREATE INDEX IF NOT EXISTS "IX_ai_prompt_audit_ai_run_id"
        ON "ai_prompt_audit" ("ai_run_id");
    `);

    // --- activity_log_new : actor_mode + ai_run_id -------------------------
    // The activity log table is generated by TypeORM's snake_case strategy
    // from the `ActivityLogNew` entity, which produces the unquoted name
    // `activity_log_new`. Guard the whole block so production (which has
    // the table) and any environment that doesn't (synchronize will
    // recreate it) both succeed.
    await queryRunner.query(`
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
            ALTER TABLE "activity_log_new"
              ADD COLUMN "ai_run_id" uuid;
          END IF;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'activity_log_new' AND column_name = 'ai_run_id'
        ) THEN
          ALTER TABLE "activity_log_new" DROP COLUMN "ai_run_id";
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'activity_log_new' AND column_name = 'actor_mode'
        ) THEN
          ALTER TABLE "activity_log_new" DROP COLUMN "actor_mode";
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "activity_log_new_actor_mode_enum";`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "ai_prompt_audit";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_tool_calls";`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "ai_tool_calls_status_enum";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_tool_registry";`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "ai_tool_registry_risk_level_enum";`,
    );
  }
}
