import { UseGuards } from '@nestjs/common';
import {
  Args,
  Context,
  Float,
  Int,
  Mutation,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';

import { AdminAiPurchasesCsvResponse } from './response/ai-billing.response';
import { AiCreditPurchase } from 'src/entities/ai-credit-purchase.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { SubscriptionPlanDetails } from 'src/entities/subscription-plan-details.entity';

import { AiBillingService } from './ai-billing.service';
import {
  AdminAiPurchasesFilterInput,
  AttachPaymentMethodInput,
  ManualTopupInput,
  UpdateAiBillingSettingsInput,
} from './dto/ai-billing.dto';
import {
  AdminAiPurchasesPageResponse,
  AiBillingOverviewResponse,
  AiBillingSettingsResponse,
  AiCreditLedgerEntry,
  AiCreditPurchaseResponse,
  StripeSetupIntentResponse,
  TopupResultResponse,
} from './response/ai-billing.response';

const settingsToResp = (s: any): AiBillingSettingsResponse => ({
  company_id: s.company_id,
  auto_topup_enabled: !!s.auto_topup_enabled,
  low_balance_trigger_usd: Number(s.low_balance_trigger_usd ?? 0),
  topup_amount_usd: Number(s.topup_amount_usd ?? 0),
  monthly_topup_cap_usd: Number(s.monthly_topup_cap_usd ?? 0),
  stripe_payment_method_id: s.stripe_payment_method_id ?? undefined,
  billing_email: s.billing_email ?? undefined,
  last_topup_failure_reason: s.last_topup_failure_reason ?? undefined,
  is_sandbox: !!s.is_sandbox,
});

const purchaseToResp = (
  p: AiCreditPurchase,
  companyName?: string,
): AiCreditPurchaseResponse => ({
  id: p.id,
  company_id: p.company_id,
  company_name: companyName,
  credits_purchased_usd: Number(p.credits_purchased_usd),
  stripe_fee_usd: Number(p.stripe_fee_usd),
  amount_charged_usd: Number(p.amount_charged_usd),
  currency: p.currency,
  status: p.status,
  trigger_type: p.trigger_type,
  stripe_payment_intent_id: p.stripe_payment_intent_id ?? undefined,
  failure_reason: p.failure_reason ?? undefined,
  receipt_pdf_url: p.receipt_pdf_url ?? undefined,
  created_on: p.created_on,
});

@Resolver()
export class AiBillingResolver {
  constructor(
    private readonly billing: AiBillingService,
    private readonly jwtInternalService: JwtInternalService,
    @InjectRepository(SubscriptionDetails)
    private readonly subscriptionRepo: Repository<SubscriptionDetails>,
    @InjectRepository(SubscriptionPlanDetails)
    private readonly planRepo: Repository<SubscriptionPlanDetails>,
    @InjectRepository(AiCreditPurchase)
    private readonly purchaseRepo: Repository<AiCreditPurchase>,
    @InjectRepository(CompanyDetails)
    private readonly companyRepo: Repository<CompanyDetails>,
  ) {}

  private async decode(ctx: any): Promise<any> {
    return this.jwtInternalService.decodeJwtToken(ctx);
  }

  private assertAdmin(decoded: any) {
    const isAdmin =
      decoded?.isAdmin === true ||
      decoded?.logged_in_by === 'ADMIN' ||
      decoded?.role === 'PORTAL_ADMIN' ||
      decoded?.role === 'RESTRICTED_PORTAL_ADMIN';
    if (!isAdmin) throw new Error('Admin only');
  }

  private assertCompanyAccess(decoded: any, companyId: number) {
    if (
      decoded?.isAdmin ||
      decoded?.logged_in_by === 'ADMIN' ||
      decoded?.role === 'PORTAL_ADMIN' ||
      decoded?.role === 'RESTRICTED_PORTAL_ADMIN'
    )
      return;
    // Non-admin tokens MUST be pinned to a company and that company MUST
    // match the one being acted on. No "open" tokens are accepted — this
    // closes the IDOR gap flagged in code review.
    const tokenCompanyId = Number(decoded?.company_id ?? 0);
    if (!tokenCompanyId || tokenCompanyId !== Number(companyId)) {
      throw new Error('Forbidden: company mismatch');
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  //  User-facing
  // ──────────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Query(() => AiBillingOverviewResponse)
  async getAiBillingOverview(
    @Context() ctx: any,
    @Args('company_id', { type: () => Int }) company_id: number,
  ): Promise<AiBillingOverviewResponse> {
    const decoded = await this.decode(ctx);
    this.assertCompanyAccess(decoded, company_id);
    const [balance, settings, sub, savedCard] = await Promise.all([
      this.billing.getBalance(company_id),
      this.billing.getSettings(company_id),
      this.subscriptionRepo.findOne({ where: { company_id } }),
      this.billing.getSavedCard(company_id),
    ]);
    let planCredit = 0;
    let planName: string | undefined;
    if (sub?.plan_id) {
      const plan = await this.planRepo.findOne({
        where: { plan_id: sub.plan_id },
      });
      planCredit = Number((plan as any)?.monthly_ai_credit ?? 0);
      planName = plan?.plan_name;
    }
    return {
      company_id,
      balance_usd: balance,
      plan_monthly_credit_usd: planCredit,
      plan_name: planName,
      low_balance_trigger_usd: Number(settings.low_balance_trigger_usd ?? 0),
      is_below_trigger:
        balance < Number(settings.low_balance_trigger_usd ?? 0),
      last_allocation_period: undefined,
      settings: settingsToResp(settings),
      saved_card: savedCard ?? undefined,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => [AiCreditLedgerEntry])
  async getAiCreditLedger(
    @Context() ctx: any,
    @Args('company_id', { type: () => Int }) company_id: number,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ): Promise<AiCreditLedgerEntry[]> {
    const decoded = await this.decode(ctx);
    this.assertCompanyAccess(decoded, company_id);
    const rows = await this.billing.getLedger(company_id, limit ?? 50);
    return rows.map((r) => ({
      id: r.id,
      event_type: r.event_type,
      amount_usd: Number(r.amount_usd),
      balance_after: Number(r.balance_after),
      notes: r.notes ?? undefined,
      created_on: r.created_on,
    }));
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => [AiCreditPurchaseResponse])
  async getAiCreditPurchases(
    @Context() ctx: any,
    @Args('company_id', { type: () => Int }) company_id: number,
  ): Promise<AiCreditPurchaseResponse[]> {
    const decoded = await this.decode(ctx);
    this.assertCompanyAccess(decoded, company_id);
    const rows = await this.purchaseRepo.find({
      where: { company_id },
      order: { created_on: 'DESC' },
      take: 200,
    });
    return rows.map((r) => purchaseToResp(r));
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => AiBillingSettingsResponse)
  async updateAiBillingSettings(
    @Context() ctx: any,
    @Args('company_id', { type: () => Int }) company_id: number,
    @Args('input') input: UpdateAiBillingSettingsInput,
  ): Promise<AiBillingSettingsResponse> {
    const decoded = await this.decode(ctx);
    this.assertCompanyAccess(decoded, company_id);
    const updated = await this.billing.updateSettings(
      company_id,
      input,
      decoded?.userId,
    );
    return settingsToResp(updated);
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => StripeSetupIntentResponse)
  async createAiBillingSetupIntent(
    @Context() ctx: any,
    @Args('company_id', { type: () => Int }) company_id: number,
    @Args('is_sandbox', { nullable: true, defaultValue: false })
    is_sandbox: boolean,
  ): Promise<StripeSetupIntentResponse> {
    const decoded = await this.decode(ctx);
    this.assertCompanyAccess(decoded, company_id);
    const r = await this.billing.createSetupIntent(company_id, !!is_sandbox);
    return { client_secret: r.clientSecret, customer_id: r.customerId };
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => AiBillingSettingsResponse)
  async attachAiBillingPaymentMethod(
    @Context() ctx: any,
    @Args('company_id', { type: () => Int }) company_id: number,
    @Args('input') input: AttachPaymentMethodInput,
  ): Promise<AiBillingSettingsResponse> {
    const decoded = await this.decode(ctx);
    this.assertCompanyAccess(decoded, company_id);
    const updated = await this.billing.attachPaymentMethod(
      company_id,
      input.payment_method_id,
      !!input.is_sandbox,
      decoded?.userId,
    );
    return settingsToResp(updated);
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => AiBillingSettingsResponse)
  async detachAiBillingPaymentMethod(
    @Context() ctx: any,
    @Args('company_id', { type: () => Int }) company_id: number,
  ): Promise<AiBillingSettingsResponse> {
    const decoded = await this.decode(ctx);
    this.assertCompanyAccess(decoded, company_id);
    const updated = await this.billing.detachPaymentMethod(
      company_id,
      decoded?.userId,
    );
    return settingsToResp(updated);
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => TopupResultResponse)
  async manualAiCreditTopup(
    @Context() ctx: any,
    @Args('company_id', { type: () => Int }) company_id: number,
    @Args('input') input: ManualTopupInput,
  ): Promise<TopupResultResponse> {
    const decoded = await this.decode(ctx);
    this.assertCompanyAccess(decoded, company_id);
    const r = await this.billing.chargeTopup({
      companyId: company_id,
      creditsUsd: input.credits_usd,
      trigger: 'manual',
      initiatedByUserId: decoded?.userId ?? null,
      isSandbox: !!input.is_sandbox,
    });
    return {
      purchase_id: r.purchase.id,
      status: r.purchase.status,
      credits_purchased_usd: Number(r.purchase.credits_purchased_usd),
      amount_charged_usd: Number(r.purchase.amount_charged_usd),
      stripe_fee_usd: Number(r.purchase.stripe_fee_usd),
      balance_after: r.balanceAfter,
      client_secret: r.clientSecret ?? undefined,
      failure_reason: r.purchase.failure_reason ?? undefined,
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  //  Admin-only
  // ──────────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Query(() => Float)
  async getAiUserCostMultiplier(@Context() ctx: any): Promise<number> {
    const decoded = await this.decode(ctx);
    this.assertAdmin(decoded);
    return this.billing.getCostMultiplier();
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => Float)
  async setAiUserCostMultiplier(
    @Context() ctx: any,
    @Args('value', { type: () => Float }) value: number,
  ): Promise<number> {
    const decoded = await this.decode(ctx);
    this.assertAdmin(decoded);
    return this.billing.setCostMultiplier(
      value,
      decoded?.admin_id ?? decoded?.adminId,
    );
  }

  /**
   * Build a TypeORM QueryBuilder that applies every admin filter at the SQL
   * layer so `total_count` matches the rows returned, min/max amount filters
   * affect pagination, and the totals row reflects the same filtered set.
   */
  private buildAdminPurchasesQb(f: AdminAiPurchasesFilterInput) {
    const qb = this.purchaseRepo.createQueryBuilder('p');
    if (f.company_id) qb.andWhere('p.company_id = :cid', { cid: f.company_id });
    if (f.status) qb.andWhere('p.status = :st', { st: f.status });
    if (f.start_date && f.end_date) {
      qb.andWhere('p.created_on BETWEEN :sd AND :ed', {
        sd: new Date(f.start_date),
        ed: new Date(f.end_date),
      });
    } else if (f.start_date) {
      qb.andWhere('p.created_on >= :sd', { sd: new Date(f.start_date) });
    } else if (f.end_date) {
      qb.andWhere('p.created_on <= :ed', { ed: new Date(f.end_date) });
    }
    if (f.min_amount != null)
      qb.andWhere('p.amount_charged_usd >= :minA', { minA: f.min_amount });
    if (f.max_amount != null)
      qb.andWhere('p.amount_charged_usd <= :maxA', { maxA: f.max_amount });
    return qb;
  }

  private async hydrateCompanyNames(rows: AiCreditPurchase[]) {
    const companyIds = Array.from(new Set(rows.map((r) => r.company_id)));
    const companies = companyIds.length
      ? await this.companyRepo.find({
          where: companyIds.map((id) => ({ company_id: id }) as any),
        })
      : [];
    return new Map<number, string>(
      companies.map((c: any) => [c.company_id, c.company_name]),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => AdminAiPurchasesPageResponse)
  async getAdminAiPurchases(
    @Context() ctx: any,
    @Args('input', { nullable: true }) input?: AdminAiPurchasesFilterInput,
  ): Promise<AdminAiPurchasesPageResponse> {
    const decoded = await this.decode(ctx);
    this.assertAdmin(decoded);
    const f = input ?? ({} as AdminAiPurchasesFilterInput);

    const page = Math.max(1, f.page_number ?? 1);
    const size = Math.min(200, f.page_size ?? 50);

    // Page query with all filters applied at SQL layer.
    const [rows, total_count] = await this.buildAdminPurchasesQb(f)
      .orderBy('p.created_on', 'DESC')
      .skip((page - 1) * size)
      .take(size)
      .getManyAndCount();

    // Totals query — same filters, restricted to succeeded charges.
    const totalsRow = await this.buildAdminPurchasesQb(f)
      .andWhere(`p.status = :succ`, { succ: 'succeeded' })
      .select('COALESCE(SUM(p.amount_charged_usd),0)', 'rev')
      .addSelect('COALESCE(SUM(p.credits_purchased_usd),0)', 'credits')
      .addSelect('COALESCE(SUM(p.stripe_fee_usd),0)', 'fees')
      .getRawOne<{ rev: string; credits: string; fees: string }>();

    const nameMap = await this.hydrateCompanyNames(rows);

    return {
      rows: rows.map((r) => purchaseToResp(r, nameMap.get(r.company_id))),
      total_count,
      total_revenue_usd: +Number(totalsRow?.rev ?? 0).toFixed(2),
      total_credits_sold_usd: +Number(totalsRow?.credits ?? 0).toFixed(2),
      total_stripe_fees_usd: +Number(totalsRow?.fees ?? 0).toFixed(2),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => AdminAiPurchasesCsvResponse)
  async exportAdminAiPurchasesCsv(
    @Context() ctx: any,
    @Args('input', { nullable: true }) input?: AdminAiPurchasesFilterInput,
  ): Promise<AdminAiPurchasesCsvResponse> {
    const decoded = await this.decode(ctx);
    this.assertAdmin(decoded);
    const f = input ?? ({} as AdminAiPurchasesFilterInput);

    // Cap export at 10k rows to keep the GraphQL payload bounded.
    const rows = await this.buildAdminPurchasesQb(f)
      .orderBy('p.created_on', 'DESC')
      .take(10000)
      .getMany();
    const nameMap = await this.hydrateCompanyNames(rows);

    const escape = (v: any) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = [
      'purchase_id',
      'company_id',
      'company_name',
      'created_on',
      'trigger_type',
      'status',
      'currency',
      'credits_purchased_usd',
      'stripe_fee_usd',
      'amount_charged_usd',
      'stripe_payment_intent_id',
      'failure_reason',
      'receipt_pdf_url',
    ].join(',');
    const lines = rows.map((r) =>
      [
        r.id,
        r.company_id,
        nameMap.get(r.company_id) ?? '',
        r.created_on.toISOString(),
        r.trigger_type,
        r.status,
        r.currency,
        Number(r.credits_purchased_usd).toFixed(2),
        Number(r.stripe_fee_usd).toFixed(2),
        Number(r.amount_charged_usd).toFixed(2),
        r.stripe_payment_intent_id ?? '',
        r.failure_reason ?? '',
        r.receipt_pdf_url ?? '',
      ]
        .map(escape)
        .join(','),
    );
    return {
      filename: `ai-credit-purchases-${new Date().toISOString().slice(0, 10)}.csv`,
      csv: [header, ...lines].join('\n'),
      row_count: rows.length,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => Boolean)
  async runAiCreditMonthlyAllocation(
    @Context() ctx: any,
    @Args('period', { nullable: true }) period?: string,
  ): Promise<boolean> {
    const decoded = await this.decode(ctx);
    this.assertAdmin(decoded);
    await this.billing.runMonthlyAllocation(period);
    return true;
  }
}
