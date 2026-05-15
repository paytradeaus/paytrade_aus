import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Task #187 — Show the real card last-4 on AI credit top-up receipts.
 *
 * Adds nullable `card_brand` and `card_last4` columns to
 * `ai_credit_purchases` so the receipt template can render the actual
 * card customers used instead of "—".
 */
export class AiCreditPurchaseCardDetails1715731700000
  implements MigrationInterface
{
  name = 'AiCreditPurchaseCardDetails1715731700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'ai_credit_purchases'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'ai_credit_purchases'
            AND column_name = 'card_brand'
        ) THEN
          ALTER TABLE "ai_credit_purchases"
            ADD COLUMN "card_brand" varchar(32) NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'ai_credit_purchases'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'ai_credit_purchases'
            AND column_name = 'card_last4'
        ) THEN
          ALTER TABLE "ai_credit_purchases"
            ADD COLUMN "card_last4" varchar(8) NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ai_credit_purchases" DROP COLUMN IF EXISTS "card_last4";
    `);
    await queryRunner.query(`
      ALTER TABLE "ai_credit_purchases" DROP COLUMN IF EXISTS "card_brand";
    `);
  }
}
