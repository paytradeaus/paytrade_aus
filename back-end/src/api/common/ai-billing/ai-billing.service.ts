import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import Stripe from 'stripe';

import { AiBillingSettings } from 'src/entities/ai-billing-settings.entity';
import { AiCreditBalance } from 'src/entities/ai-credit-balance.entity';
import {
  AiCreditEventType,
  AiCreditLedger,
} from 'src/entities/ai-credit-ledger.entity';
import {
  AiCreditPurchase,
  AiCreditPurchaseTrigger,
} from 'src/entities/ai-credit-purchase.entity';
import { CommonSettings } from 'src/entities/common-settings.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { SubscriptionPlanDetails } from 'src/entities/subscription-plan-details.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { getStripeInstance } from 'src/libs/@stripe-helper/stripe-helper';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

import {
  AI_USER_COST_MULTIPLIER_DEFAULT,
  AI_USER_COST_MULTIPLIER_SETTING_NAME,
} from './ai-billing.constants';

export interface ConsumeCreditInput {
  companyId: number;
  rawCostUsd: number;
  aiRunId?: string | null;
  toolCallId?: string | null;
  idempotencyKey?: string | null;
  notes?: string | null;
}

export interface ConsumeCreditResult {
  ok: true;
  amountChargedUsd: number;
  multiplier: number;
  balanceBefore: number;
  balanceAfter: number;
  ledgerId: string;
}

export interface InsufficientCreditError {
  ok: false;
  code: 'insufficient_credit';
  balanceUsd: number;
  required: number;
  message: string;
}

export interface PurchaseResult {
  purchase: AiCreditPurchase;
  balanceAfter: number;
  clientSecret?: string | null;
}

const num = (v: any): number => (v == null ? 0 : Number(v));
const fmt = (v: number): string => v.toFixed(4);

/**
 * Task #161 — AI Billing core service.
 *
 * Responsibilities:
 *  - Resolve the admin-only `ai_user_cost_multiplier` from `common_settings`.
 *  - Maintain the per-business `ai_credit_balances` cache by writing to
 *    `ai_credit_ledger` inside a transaction with a row-level lock.
 *  - Allocate monthly credits at the start of each calendar period; idempotent
 *    on `(company_id, period)`.
 *  - Capture Stripe payment methods (SetupIntent), perform manual + auto
 *    top-ups with the Stripe transaction fee passed through to the user.
 *
 * The service intentionally does not depend on EmailQueue/Puppeteer so it can
 * be reused from cron, GraphQL resolvers, and webhook handlers; the receipt
 * generation hook is invoked through a callback set by the module.
 */
@Injectable()
export class AiBillingService {
  private readonly logger = new PaytradeLogger('AI_BILLING_SERVICE');
  private receiptHandler:
    | ((purchase: AiCreditPurchase) => Promise<void>)
    | null = null;

  constructor(
    @InjectRepository(AiBillingSettings)
    private readonly settingsRepo: Repository<AiBillingSettings>,
    @InjectRepository(AiCreditBalance)
    private readonly balanceRepo: Repository<AiCreditBalance>,
    @InjectRepository(AiCreditLedger)
    private readonly ledgerRepo: Repository<AiCreditLedger>,
    @InjectRepository(AiCreditPurchase)
    private readonly purchaseRepo: Repository<AiCreditPurchase>,
    @InjectRepository(CommonSettings)
    private readonly commonSettingsRepo: Repository<CommonSettings>,
    @InjectRepository(SubscriptionDetails)
    private readonly subscriptionRepo: Repository<SubscriptionDetails>,
    @InjectRepository(SubscriptionPlanDetails)
    private readonly planRepo: Repository<SubscriptionPlanDetails>,
    @InjectRepository(CompanyDetails)
    private readonly companyRepo: Repository<CompanyDetails>,
    @InjectRepository(UserDetails)
    private readonly userRepo: Repository<UserDetails>,
    private readonly dataSource: DataSource,
  ) {}

  /** Set by AiBillingModule to wire receipt PDF + email without a circular dep. */
  registerReceiptHandler(
    handler: (purchase: AiCreditPurchase) => Promise<void>,
  ): void {
    this.receiptHandler = handler;
  }

  // ────────────────────────────────────────────────────────────────────────
  //  Multiplier (admin only)
  // ────────────────────────────────────────────────────────────────────────

  async getCostMultiplier(): Promise<number> {
    const row = await this.commonSettingsRepo.findOne({
      where: { setting_name: AI_USER_COST_MULTIPLIER_SETTING_NAME },
    });
    const parsed = Number(row?.setting_option);
    if (!row || !Number.isFinite(parsed) || parsed <= 0) {
      return AI_USER_COST_MULTIPLIER_DEFAULT;
    }
    return parsed;
  }

  async setCostMultiplier(value: number, adminId?: number): Promise<number> {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error('Cost multiplier must be a positive number');
    }
    const existing = await this.commonSettingsRepo.findOne({
      where: { setting_name: AI_USER_COST_MULTIPLIER_SETTING_NAME },
    });
    if (existing) {
      existing.setting_option = String(value);
      existing.updated_by = adminId ?? null;
      existing.updated_group = 'ADMIN';
      await this.commonSettingsRepo.save(existing);
    } else {
      const row = this.commonSettingsRepo.create({
        setting_name: AI_USER_COST_MULTIPLIER_SETTING_NAME,
        setting_option: String(value),
        status: 'Active',
        created_by: adminId ?? null,
        created_group: 'ADMIN',
      });
      await this.commonSettingsRepo.save(row);
    }
    return value;
  }

  // ────────────────────────────────────────────────────────────────────────
  //  Balances + ledger
  // ────────────────────────────────────────────────────────────────────────

  async getBalance(companyId: number): Promise<number> {
    const row = await this.balanceRepo.findOne({
      where: { company_id: companyId },
    });
    return num(row?.balance_usd);
  }

  async getLedger(
    companyId: number,
    limit = 50,
  ): Promise<AiCreditLedger[]> {
    return this.ledgerRepo.find({
      where: { company_id: companyId },
      order: { created_on: 'DESC' },
      take: Math.min(Math.max(limit, 1), 500),
    });
  }

  /**
   * Apply a ledger event inside a serialized-by-row transaction. Returns the
   * resulting balance. Designed to be the *only* writer of `ai_credit_balances`.
   */
  private async applyLedgerEvent(
    manager: EntityManager,
    params: {
      companyId: number;
      eventType: AiCreditEventType;
      amountUsd: number; // signed
      rawCostUsd?: number | null;
      multiplier?: number | null;
      purchaseId?: string | null;
      aiRunId?: string | null;
      toolCallId?: string | null;
      stripePaymentIntentId?: string | null;
      idempotencyKey?: string | null;
      notes?: string | null;
      createdBy?: number | null;
      allowNegative?: boolean;
    },
  ): Promise<{ ledgerId: string; balanceBefore: number; balanceAfter: number }> {
    const {
      companyId,
      eventType,
      amountUsd,
      rawCostUsd = null,
      multiplier = null,
      purchaseId = null,
      aiRunId = null,
      toolCallId = null,
      stripePaymentIntentId = null,
      idempotencyKey = null,
      notes = null,
      createdBy = null,
      allowNegative = false,
    } = params;

    // Lock the balance row (or create a fresh one). UPSERT first to ensure a
    // row exists, then SELECT FOR UPDATE.
    await manager.query(
      `INSERT INTO ai_credit_balances (company_id, balance_usd)
       VALUES ($1, 0)
       ON CONFLICT (company_id) DO NOTHING`,
      [companyId],
    );
    const locked = await manager.query(
      `SELECT balance_usd FROM ai_credit_balances WHERE company_id = $1 FOR UPDATE`,
      [companyId],
    );
    const balanceBefore = num(locked?.[0]?.balance_usd);

    // Idempotency short-circuit: if a row with this (company, event, key)
    // already exists, return its result without applying twice.
    if (idempotencyKey) {
      const dup = await manager.query(
        `SELECT id, balance_before, balance_after FROM ai_credit_ledger
         WHERE company_id = $1 AND event_type = $2 AND idempotency_key = $3
         LIMIT 1`,
        [companyId, eventType, idempotencyKey],
      );
      if (dup?.length) {
        return {
          ledgerId: dup[0].id,
          balanceBefore: num(dup[0].balance_before),
          balanceAfter: num(dup[0].balance_after),
        };
      }
    }

    const balanceAfter = balanceBefore + amountUsd;
    if (!allowNegative && balanceAfter < 0) {
      throw new InsufficientCreditException(balanceBefore, Math.abs(amountUsd));
    }

    const inserted = await manager.query(
      `INSERT INTO ai_credit_ledger
        (company_id, event_type, amount_usd, balance_before, balance_after,
         raw_cost_usd, multiplier, purchase_id, ai_run_id, tool_call_id,
         stripe_payment_intent_id, idempotency_key, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [
        companyId,
        eventType,
        fmt(amountUsd),
        fmt(balanceBefore),
        fmt(balanceAfter),
        rawCostUsd != null ? rawCostUsd.toFixed(6) : null,
        multiplier != null ? multiplier.toFixed(4) : null,
        purchaseId,
        aiRunId,
        toolCallId,
        stripePaymentIntentId,
        idempotencyKey,
        notes,
        createdBy,
      ],
    );

    await manager.query(
      `UPDATE ai_credit_balances
         SET balance_usd = $2,
             last_event_at = timezone('utc', now()),
             updated_on = timezone('utc', now())
       WHERE company_id = $1`,
      [companyId, fmt(balanceAfter)],
    );

    return {
      ledgerId: inserted[0].id,
      balanceBefore,
      balanceAfter,
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  //  Spending hook
  // ────────────────────────────────────────────────────────────────────────

  async consumeCredit(
    input: ConsumeCreditInput,
  ): Promise<ConsumeCreditResult | InsufficientCreditError> {
    if (!input.companyId || !Number.isFinite(input.rawCostUsd)) {
      throw new Error('consumeCredit requires companyId and rawCostUsd');
    }
    if (input.rawCostUsd < 0) {
      throw new Error('rawCostUsd must be >= 0');
    }
    const multiplier = await this.getCostMultiplier();
    const charged = +(input.rawCostUsd * multiplier).toFixed(4);
    if (charged === 0) {
      const balance = await this.getBalance(input.companyId);
      return {
        ok: true,
        amountChargedUsd: 0,
        multiplier,
        balanceBefore: balance,
        balanceAfter: balance,
        ledgerId: '',
      };
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const result = await this.applyLedgerEvent(manager, {
          companyId: input.companyId,
          eventType: 'consumption',
          amountUsd: -charged,
          rawCostUsd: input.rawCostUsd,
          multiplier,
          aiRunId: input.aiRunId ?? null,
          toolCallId: input.toolCallId ?? null,
          idempotencyKey: input.idempotencyKey ?? null,
          notes: input.notes ?? null,
        });
        return {
          ok: true,
          amountChargedUsd: charged,
          multiplier,
          balanceBefore: result.balanceBefore,
          balanceAfter: result.balanceAfter,
          ledgerId: result.ledgerId,
        };
      });
    } catch (err) {
      if (err instanceof InsufficientCreditException) {
        return {
          ok: false,
          code: 'insufficient_credit',
          balanceUsd: err.balance,
          required: err.required,
          message: `AI credit balance ($${err.balance.toFixed(2)}) is insufficient for this request ($${err.required.toFixed(2)}). Top up to continue.`,
        };
      }
      throw err;
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  //  Monthly allocation
  // ────────────────────────────────────────────────────────────────────────

  static currentPeriod(now: Date = new Date()): string {
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  /**
   * Allocate the per-plan `monthly_ai_credit` to every active business
   * profile, zeroing any unspent balance from the previous period. Idempotent
   * on `(company_id, period)`.
   */
  async runMonthlyAllocation(period?: string): Promise<{
    allocated: number;
    zeroed: number;
    skipped: number;
  }> {
    const targetPeriod = period ?? AiBillingService.currentPeriod();
    let allocated = 0;
    let zeroed = 0;
    let skipped = 0;

    const subs: Array<{
      company_id: number;
      monthly_ai_credit: string;
    }> = await this.dataSource.query(
      `SELECT sd.company_id, COALESCE(spd.monthly_ai_credit, 0) AS monthly_ai_credit
         FROM subscription_details sd
         LEFT JOIN subscription_plan_details spd ON spd.plan_id = sd.plan_id
        WHERE sd.status IN ('Subscribed', 'Under Trial', 'Past Due')`,
    );

    for (const row of subs) {
      const allocAmount = num(row.monthly_ai_credit);
      try {
        await this.dataSource.transaction(async (manager) => {
          // Skip if we already allocated for this period.
          const cached = await manager.query(
            `SELECT last_allocation_period FROM ai_credit_balances
              WHERE company_id = $1 FOR UPDATE`,
            [row.company_id],
          );
          if (cached?.[0]?.last_allocation_period === targetPeriod) {
            skipped++;
            return;
          }

          // Step 1: zero existing balance (if any).
          const balRow = await manager.query(
            `SELECT balance_usd FROM ai_credit_balances WHERE company_id = $1`,
            [row.company_id],
          );
          const currentBalance = num(balRow?.[0]?.balance_usd);
          if (currentBalance > 0) {
            await this.applyLedgerEvent(manager, {
              companyId: row.company_id,
              eventType: 'rollover_zero',
              amountUsd: -currentBalance,
              idempotencyKey: `rollover:${targetPeriod}`,
              notes: `Period rollover ${targetPeriod}; unspent credits zeroed`,
              allowNegative: true,
            });
            zeroed++;
          }

          // Step 2: allocate plan amount.
          if (allocAmount > 0) {
            await this.applyLedgerEvent(manager, {
              companyId: row.company_id,
              eventType: 'allocation',
              amountUsd: allocAmount,
              idempotencyKey: `allocation:${targetPeriod}`,
              notes: `Plan allocation ${targetPeriod}`,
            });
            allocated++;
          }

          await manager.query(
            `UPDATE ai_credit_balances
                SET last_allocation_at = timezone('utc', now()),
                    last_allocation_period = $2
              WHERE company_id = $1`,
            [row.company_id, targetPeriod],
          );
        });
      } catch (err) {
        this.logger.error(
          `Allocation failed for company ${row.company_id}: ${err}`,
        );
      }
    }

    this.logger.log(
      `Monthly allocation ${targetPeriod}: allocated=${allocated} zeroed=${zeroed} skipped=${skipped}`,
    );
    return { allocated, zeroed, skipped };
  }

  // ────────────────────────────────────────────────────────────────────────
  //  Settings
  // ────────────────────────────────────────────────────────────────────────

  async getSettings(companyId: number): Promise<AiBillingSettings> {
    let row = await this.settingsRepo.findOne({
      where: { company_id: companyId },
    });
    if (!row) {
      row = this.settingsRepo.create({ company_id: companyId });
      await this.settingsRepo.save(row);
    }
    return row;
  }

  async updateSettings(
    companyId: number,
    patch: Partial<{
      auto_topup_enabled: boolean;
      low_balance_trigger_usd: number;
      topup_amount_usd: number;
      monthly_topup_cap_usd: number;
      billing_email: string | null;
    }>,
    actorUserId?: number,
  ): Promise<AiBillingSettings> {
    const row = await this.getSettings(companyId);
    if (patch.auto_topup_enabled !== undefined) {
      row.auto_topup_enabled = patch.auto_topup_enabled;
    }
    if (patch.low_balance_trigger_usd !== undefined) {
      this.assertPositive(patch.low_balance_trigger_usd, 'low balance trigger');
      row.low_balance_trigger_usd = String(patch.low_balance_trigger_usd);
    }
    if (patch.topup_amount_usd !== undefined) {
      this.assertPositive(patch.topup_amount_usd, 'top-up amount');
      row.topup_amount_usd = String(patch.topup_amount_usd);
    }
    if (patch.monthly_topup_cap_usd !== undefined) {
      this.assertPositive(
        patch.monthly_topup_cap_usd,
        'monthly top-up cap',
        true,
      );
      row.monthly_topup_cap_usd = String(patch.monthly_topup_cap_usd);
    }
    if (patch.billing_email !== undefined) {
      row.billing_email = patch.billing_email;
    }
    row.updated_by = actorUserId ?? null;
    await this.settingsRepo.save(row);
    return row;
  }

  private assertPositive(v: number, label: string, allowZero = false) {
    if (!Number.isFinite(v) || (allowZero ? v < 0 : v <= 0)) {
      throw new Error(`${label} must be a positive number`);
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  //  Stripe — payment method capture (SetupIntent)
  // ────────────────────────────────────────────────────────────────────────

  private async resolveStripeCustomer(
    companyId: number,
    isSandbox: boolean,
  ): Promise<{ stripe: Stripe; customerId: string; sub: SubscriptionDetails }> {
    const sub = await this.subscriptionRepo.findOne({
      where: { company_id: companyId },
    });
    if (!sub) {
      throw new Error(`No subscription record for company ${companyId}`);
    }
    const stripe = getStripeInstance(isSandbox);
    if (sub.stripe_customer_id) {
      return { stripe, customerId: sub.stripe_customer_id, sub };
    }
    const company = await this.companyRepo.findOne({
      where: { company_id: companyId } as any,
    });
    const customer = await stripe.customers.create({
      name: company?.company_name ?? `Company ${companyId}`,
      email: (company as any)?.company_email_id ?? undefined,
      phone: (company as any)?.company_phone_no ?? undefined,
      metadata: { paytrade_company_id: String(companyId) },
    });
    sub.stripe_customer_id = customer.id;
    await this.subscriptionRepo.save(sub);
    return { stripe, customerId: customer.id, sub };
  }

  async createSetupIntent(
    companyId: number,
    isSandbox = false,
  ): Promise<{ clientSecret: string; customerId: string }> {
    const { stripe, customerId } = await this.resolveStripeCustomer(
      companyId,
      isSandbox,
    );
    const intent = await stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session',
      payment_method_types: ['card'],
    });
    return { clientSecret: intent.client_secret!, customerId };
  }

  async attachPaymentMethod(
    companyId: number,
    paymentMethodId: string,
    isSandbox = false,
    actorUserId?: number,
  ): Promise<AiBillingSettings> {
    const { stripe, customerId, sub } = await this.resolveStripeCustomer(
      companyId,
      isSandbox,
    );
    try {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
    } catch (err: any) {
      // Already-attached payment methods throw; ignore that case.
      if (!String(err?.message || '').includes('already been attached')) {
        throw err;
      }
    }
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
    if (!sub.payment_method_id) {
      sub.payment_method_id = paymentMethodId;
      await this.subscriptionRepo.save(sub);
    }
    const settings = await this.getSettings(companyId);
    settings.stripe_payment_method_id = paymentMethodId;
    settings.is_sandbox = isSandbox;
    settings.updated_by = actorUserId ?? null;
    await this.settingsRepo.save(settings);
    return settings;
  }

  // ────────────────────────────────────────────────────────────────────────
  //  Top-ups (manual + auto)
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Stripe standard rate (pass-through to user). Single source of truth so
   * the same calculation can be unit-tested.
   *
   * Standard Stripe rate (US/AU cards, 2026): 2.9% + $0.30 per successful
   * charge. Documented at https://stripe.com/pricing — kept conservative;
   * admins can override via `common_settings` if regional pricing differs.
   */
  static computeStripeFee(creditsUsd: number): number {
    const grossed = (creditsUsd + 0.3) / (1 - 0.029);
    const totalCharge = +grossed.toFixed(2);
    return +(totalCharge - creditsUsd).toFixed(4);
  }

  async chargeTopup(params: {
    companyId: number;
    creditsUsd: number;
    trigger: AiCreditPurchaseTrigger;
    initiatedByUserId?: number | null;
    initiatedByAdminId?: number | null;
    isSandbox?: boolean;
    paymentMethodIdOverride?: string | null;
  }): Promise<PurchaseResult> {
    this.assertPositive(params.creditsUsd, 'credit amount');

    const isSandbox = !!params.isSandbox;
    const settings = await this.getSettings(params.companyId);
    const paymentMethodId =
      params.paymentMethodIdOverride ?? settings.stripe_payment_method_id;
    if (!paymentMethodId) {
      throw new Error(
        'No saved payment method. Please add a card before topping up.',
      );
    }

    const fee = AiBillingService.computeStripeFee(params.creditsUsd);
    const total = +(params.creditsUsd + fee).toFixed(2);

    const purchase = this.purchaseRepo.create({
      company_id: params.companyId,
      credits_purchased_usd: params.creditsUsd.toFixed(2),
      stripe_fee_usd: fee.toFixed(4),
      amount_charged_usd: total.toFixed(2),
      currency: 'usd',
      status: 'pending',
      trigger_type: params.trigger,
      stripe_payment_method_id: paymentMethodId,
      is_sandbox: isSandbox,
      initiated_by_user_id: params.initiatedByUserId ?? null,
      initiated_by_admin_id: params.initiatedByAdminId ?? null,
    });
    await this.purchaseRepo.save(purchase);

    settings.last_topup_attempt_at = new Date();
    settings.last_topup_failure_reason = null;
    await this.settingsRepo.save(settings);

    let balanceAfter = await this.getBalance(params.companyId);
    try {
      const { stripe, customerId } = await this.resolveStripeCustomer(
        params.companyId,
        isSandbox,
      );
      const intent = await stripe.paymentIntents.create({
        amount: Math.round(total * 100),
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        confirm: true,
        off_session: params.trigger === 'auto_topup',
        description: `Pay Trade AI credits: $${params.creditsUsd.toFixed(
          2,
        )} (+$${fee.toFixed(2)} fee)`,
        metadata: {
          paytrade_purchase_id: purchase.id,
          paytrade_company_id: String(params.companyId),
          trigger: params.trigger,
        },
      });
      purchase.stripe_payment_intent_id = intent.id;
      purchase.stripe_charge_id =
        (intent.latest_charge as string | null) ?? null;

      if (intent.status === 'succeeded') {
        purchase.status = 'succeeded';
        await this.purchaseRepo.save(purchase);

        const result = await this.dataSource.transaction(async (manager) =>
          this.applyLedgerEvent(manager, {
            companyId: params.companyId,
            eventType: 'topup',
            amountUsd: params.creditsUsd,
            purchaseId: purchase.id,
            stripePaymentIntentId: intent.id,
            idempotencyKey: `topup:${intent.id}`,
            notes: `Top-up via ${params.trigger}; fee $${fee.toFixed(2)}`,
            createdBy: params.initiatedByUserId ?? null,
          }),
        );
        balanceAfter = result.balanceAfter;

        if (this.receiptHandler) {
          this.receiptHandler(purchase).catch((e) =>
            this.logger.error(`Receipt handler failed: ${e}`),
          );
        }
        return { purchase, balanceAfter, clientSecret: null };
      }

      if (
        intent.status === 'requires_action' ||
        intent.status === 'requires_confirmation'
      ) {
        await this.purchaseRepo.save(purchase);
        return {
          purchase,
          balanceAfter,
          clientSecret: intent.client_secret ?? null,
        };
      }

      purchase.status = 'failed';
      purchase.failure_reason = `Stripe status: ${intent.status}`;
      await this.purchaseRepo.save(purchase);
      settings.last_topup_failure_reason = purchase.failure_reason;
      await this.settingsRepo.save(settings);
      return { purchase, balanceAfter, clientSecret: null };
    } catch (err: any) {
      purchase.status = 'failed';
      purchase.failure_reason = err?.message ?? String(err);
      await this.purchaseRepo.save(purchase);
      settings.last_topup_failure_reason = purchase.failure_reason;
      await this.settingsRepo.save(settings);
      throw err;
    }
  }

  async getMonthlyAutoTopupSpend(
    companyId: number,
    period?: string,
  ): Promise<number> {
    const target = period ?? AiBillingService.currentPeriod();
    const [{ total }] = await this.dataSource.query(
      `SELECT COALESCE(SUM(credits_purchased_usd), 0) AS total
         FROM ai_credit_purchases
        WHERE company_id = $1
          AND status = 'succeeded'
          AND trigger_type = 'auto_topup'
          AND to_char(created_on, 'YYYY-MM') = $2`,
      [companyId, target],
    );
    return num(total);
  }

  /**
   * Check whether the company is below its trigger and auto-top-up should
   * fire. Returns the amount to charge, or null if it should not run.
   */
  async evaluateAutoTopup(
    companyId: number,
  ): Promise<{ amountUsd: number } | null> {
    const settings = await this.getSettings(companyId);
    if (!settings.auto_topup_enabled || !settings.stripe_payment_method_id) {
      return null;
    }
    const balance = await this.getBalance(companyId);
    if (balance >= num(settings.low_balance_trigger_usd)) return null;

    const monthSpend = await this.getMonthlyAutoTopupSpend(companyId);
    const cap = num(settings.monthly_topup_cap_usd);
    const amount = num(settings.topup_amount_usd);
    if (cap > 0 && monthSpend + amount > cap) return null;
    return { amountUsd: amount };
  }
}

export class InsufficientCreditException extends Error {
  constructor(
    public readonly balance: number,
    public readonly required: number,
  ) {
    super(`Insufficient AI credit balance`);
    this.name = 'InsufficientCreditException';
  }
}
