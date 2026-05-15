import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Task #176 — Let users start a new chat thread instead of one rolling history.
 *
 * Creates the multi-thread schema for the AI assistant:
 *   - `ai_chat_threads`   (per-user/company chat thread metadata)
 *   - `ai_chat_messages`  (ordered messages belonging to a thread)
 *
 * The legacy `user_details.ui_preferences.aiChat` array remains in place and
 * is migrated lazily on first thread access (see `AiChatService`).
 */
export class AiChatThreads1715731700000 implements MigrationInterface {
  name = 'AiChatThreads1715731700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
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

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IX_ai_chat_threads_user_id"
        ON "ai_chat_threads" ("user_id");
      CREATE INDEX IF NOT EXISTS "IX_ai_chat_threads_company_id"
        ON "ai_chat_threads" ("company_id");
      CREATE INDEX IF NOT EXISTS "IX_ai_chat_threads_user_last_message"
        ON "ai_chat_threads" ("user_id", "last_message_at");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_chat_messages" (
        "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "thread_id"   uuid NOT NULL,
        "role"        varchar(20) NOT NULL,
        "content"     text NOT NULL,
        "status"        varchar(40),
        "page_context"  jsonb,
        "created_on"    timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
      );
    `);

    // For environments where the table already exists from a prior run of this
    // migration (before page_context was added) make sure the column exists.
    await queryRunner.query(`
      ALTER TABLE "ai_chat_messages"
        ADD COLUMN IF NOT EXISTS "page_context" jsonb;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IX_ai_chat_messages_thread_id"
        ON "ai_chat_messages" ("thread_id");
      CREATE INDEX IF NOT EXISTS "IX_ai_chat_messages_thread_created"
        ON "ai_chat_messages" ("thread_id", "created_on");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_chat_messages";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_chat_threads";`);
  }
}
