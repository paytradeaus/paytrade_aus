import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { CommonSettings } from 'src/entities/common-settings.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

/**
 * Task #161 — Bootstrap seeder for AI billing.
 *
 * Two responsibilities, both idempotent and production-safe:
 *  1. Ensure the AI billing schema (tables, enums, indexes,
 *     `subscription_plan_details.monthly_ai_credit`) exists. Mirrors the
 *     `AiBillingFoundation` migration so deploys that don't run TypeORM
 *     migrations still get a working schema.
 *  2. Insert the default `ai_user_cost_multiplier = 2.00` row in
 *     `common_settings` only if it's missing — production-tuned values are
 *     never overwritten.
 */
@Injectable()
export class AiCostMultiplierSeederService implements OnApplicationBootstrap {
  private readonly logger = new PaytradeLogger('AI_COST_MULTIPLIER_SEEDER');

  constructor(
    @InjectRepository(CommonSettings)
    private readonly settingsRepo: Repository<CommonSettings>,
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    await this.ensureSchema();
    await this.ensureMultiplierRow();
  }

  private async ensureSchema() {
    try {
      await this.dataSource.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_name = 'subscription_plan_details'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'subscription_plan_details'
              AND column_name = 'monthly_ai_credit'
          ) THEN
            ALTER TABLE "subscription_plan_details"
              ADD COLUMN "monthly_ai_credit" numeric(13,2) NOT NULL DEFAULT 0;
          END IF;
        END $$;
      `);

      await this.dataSource.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_type WHERE typname = 'ai_credit_ledger_event_type_enum'
          ) THEN
            CREATE TYPE "ai_credit_ledger_event_type_enum" AS ENUM
              ('allocation', 'rollover_zero', 'consumption', 'topup', 'refund', 'adjustment');
          END IF;
        END $$;
      `);

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS "ai_credit_ledger" (
          "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "company_id"      integer NOT NULL,
          "event_type"      "ai_credit_ledger_event_type_enum" NOT NULL,
          "amount_usd"      numeric(13,4) NOT NULL,
          "balance_before"  numeric(13,4) NOT NULL,
          "balance_after"   numeric(13,4) NOT NULL,
          "raw_cost_usd"    numeric(13,6),
          "multiplier"      numeric(8,4),
          "purchase_id"     uuid,
          "ai_run_id"       uuid,
          "tool_call_id"    uuid,
          "stripe_payment_intent_id" varchar(120),
          "idempotency_key" varchar(200),
          "notes"           text,
          "created_by"      integer,
          "created_on"      timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
        );
      `);

      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS "IX_ai_credit_ledger_company_id"
          ON "ai_credit_ledger" ("company_id");
        CREATE INDEX IF NOT EXISTS "IX_ai_credit_ledger_company_created"
          ON "ai_credit_ledger" ("company_id", "created_on" DESC);
        CREATE INDEX IF NOT EXISTS "IX_ai_credit_ledger_event_type"
          ON "ai_credit_ledger" ("event_type");
        CREATE UNIQUE INDEX IF NOT EXISTS "UQ_ai_credit_ledger_idempotency"
          ON "ai_credit_ledger" ("company_id", "event_type", "idempotency_key")
          WHERE "idempotency_key" IS NOT NULL;
      `);

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS "ai_credit_balances" (
          "company_id"          integer PRIMARY KEY,
          "balance_usd"         numeric(13,4) NOT NULL DEFAULT 0,
          "last_allocation_at"  timestamp with time zone,
          "last_allocation_period" varchar(7),
          "last_event_at"       timestamp with time zone,
          "updated_on"          timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
        );
      `);

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS "ai_billing_settings" (
          "id"                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "company_id"                    integer NOT NULL UNIQUE,
          "auto_topup_enabled"            boolean NOT NULL DEFAULT false,
          "low_balance_trigger_usd"       numeric(13,2) NOT NULL DEFAULT 5.00,
          "topup_amount_usd"              numeric(13,2) NOT NULL DEFAULT 20.00,
          "monthly_topup_cap_usd"         numeric(13,2) NOT NULL DEFAULT 100.00,
          "stripe_payment_method_id"      varchar(120),
          "billing_email"                 varchar(200),
          "last_topup_attempt_at"         timestamp with time zone,
          "last_topup_failure_reason"     text,
          "is_sandbox"                    boolean NOT NULL DEFAULT false,
          "created_by"                    integer,
          "created_on"                    timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
          "updated_by"                    integer,
          "updated_on"                    timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
        );
      `);

      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS "IX_ai_billing_settings_company_id"
          ON "ai_billing_settings" ("company_id");
      `);

      await this.dataSource.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_type WHERE typname = 'ai_credit_purchases_status_enum'
          ) THEN
            CREATE TYPE "ai_credit_purchases_status_enum" AS ENUM
              ('pending', 'succeeded', 'failed', 'refunded');
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM pg_type WHERE typname = 'ai_credit_purchases_trigger_enum'
          ) THEN
            CREATE TYPE "ai_credit_purchases_trigger_enum" AS ENUM
              ('manual', 'auto_topup', 'admin');
          END IF;
        END $$;
      `);

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS "ai_credit_purchases" (
          "id"                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "company_id"                  integer NOT NULL,
          "credits_purchased_usd"       numeric(13,2) NOT NULL,
          "stripe_fee_usd"              numeric(13,4) NOT NULL DEFAULT 0,
          "amount_charged_usd"          numeric(13,2) NOT NULL,
          "currency"                    varchar(8) NOT NULL DEFAULT 'usd',
          "status"                      "ai_credit_purchases_status_enum" NOT NULL DEFAULT 'pending',
          "trigger_type"                "ai_credit_purchases_trigger_enum" NOT NULL DEFAULT 'manual',
          "stripe_payment_intent_id"    varchar(120),
          "stripe_charge_id"            varchar(120),
          "stripe_payment_method_id"    varchar(120),
          "failure_reason"              text,
          "receipt_pdf_url"             text,
          "receipt_emailed_at"          timestamp with time zone,
          "is_sandbox"                  boolean NOT NULL DEFAULT false,
          "initiated_by_user_id"        integer,
          "initiated_by_admin_id"       integer,
          "created_on"                  timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
          "updated_on"                  timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
        );
      `);

      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS "IX_ai_credit_purchases_company_id"
          ON "ai_credit_purchases" ("company_id");
        CREATE INDEX IF NOT EXISTS "IX_ai_credit_purchases_status"
          ON "ai_credit_purchases" ("status");
        CREATE INDEX IF NOT EXISTS "IX_ai_credit_purchases_created_on"
          ON "ai_credit_purchases" ("created_on" DESC);
        CREATE UNIQUE INDEX IF NOT EXISTS "UQ_ai_credit_purchases_payment_intent"
          ON "ai_credit_purchases" ("stripe_payment_intent_id")
          WHERE "stripe_payment_intent_id" IS NOT NULL;
      `);

      this.logger.log('AI billing schema ensured (tables/enums/indexes)');
    } catch (err) {
      this.logger.error(`Failed to ensure AI billing schema: ${err}`);
    }
  }

  private async ensureMultiplierRow() {
    try {
      const existing = await this.settingsRepo.findOne({
        where: { setting_name: 'ai_user_cost_multiplier' },
      });
      if (existing) {
        this.logger.log(
          `ai_user_cost_multiplier already set to ${existing.setting_option}; leaving untouched.`,
        );
        return;
      }
      const row = this.settingsRepo.create({
        setting_name: 'ai_user_cost_multiplier',
        setting_option: '2.00',
        status: 'Active',
        created_group: 'SYSTEM',
        updated_group: 'SYSTEM',
      });
      await this.settingsRepo.save(row);
      this.logger.log('Seeded default ai_user_cost_multiplier = 2.00');
    } catch (err) {
      this.logger.error(`Failed to seed AI cost multiplier: ${err}`);
    }
  }
}
