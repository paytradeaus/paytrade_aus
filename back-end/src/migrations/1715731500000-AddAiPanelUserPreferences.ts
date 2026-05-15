import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiPanelUserPreferences1715731500000
  implements MigrationInterface
{
  name = 'AddAiPanelUserPreferences1715731500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_details"
        ADD COLUMN IF NOT EXISTS "ai_live_follow_enabled" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "ai_live_follow_enabled_at" timestamp with time zone NULL,
        ADD COLUMN IF NOT EXISTS "ui_preferences" json NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_details"
        DROP COLUMN IF EXISTS "ui_preferences",
        DROP COLUMN IF EXISTS "ai_live_follow_enabled_at",
        DROP COLUMN IF EXISTS "ai_live_follow_enabled";
    `);
  }
}
