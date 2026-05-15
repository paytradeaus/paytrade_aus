import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Task #218 — Show users why an AI answer failed (specific reason, not just 'Error').
 *
 * Adds an `error_reason` column to `ai_chat_messages` so the assistant can
 * persist a short, human-friendly explanation of why a non-success message
 * was produced (quota exhausted, upstream timeout, off-topic, etc.).
 */
export class AiChatMessageErrorReason1715731800000
  implements MigrationInterface
{
  name = 'AiChatMessageErrorReason1715731800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ai_chat_messages"
        ADD COLUMN IF NOT EXISTS "error_reason" varchar(240);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ai_chat_messages"
        DROP COLUMN IF EXISTS "error_reason";
    `);
  }
}
