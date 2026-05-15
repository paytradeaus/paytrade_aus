import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Task #200 — Persist AI chat conversation messages so users can see
 * and resume past conversations in the AI panel.
 *
 * Adds `ai_conversation_messages` (one row per persisted user/assistant
 * turn, keyed by `ai_conversations.id`). Idempotent.
 */
export class AiConversationMessages1715731800000
  implements MigrationInterface
{
  name = 'AiConversationMessages1715731800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
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
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IX_ai_conversation_messages_conversation_id"
        ON "ai_conversation_messages" ("conversation_id");
      CREATE INDEX IF NOT EXISTS "IX_ai_conversation_messages_conv_created"
        ON "ai_conversation_messages" ("conversation_id", "created_on");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "ai_conversation_messages"`,
    );
  }
}
