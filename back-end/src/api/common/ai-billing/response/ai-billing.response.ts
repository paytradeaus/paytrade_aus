import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AiBillingSettingsResponse {
  @Field(() => Int) company_id: number;
  @Field() auto_topup_enabled: boolean;
  @Field(() => Float) low_balance_trigger_usd: number;
  @Field(() => Float) topup_amount_usd: number;
  @Field(() => Float) monthly_topup_cap_usd: number;
  @Field({ nullable: true }) stripe_payment_method_id?: string;
  @Field({ nullable: true }) billing_email?: string;
  @Field({ nullable: true }) last_topup_failure_reason?: string;
  @Field() is_sandbox: boolean;
}

@ObjectType()
export class AiBillingOverviewResponse {
  @Field(() => Int) company_id: number;
  @Field(() => Float) balance_usd: number;
  @Field(() => Float) plan_monthly_credit_usd: number;
  @Field({ nullable: true }) plan_name?: string;
  @Field(() => Float) low_balance_trigger_usd: number;
  @Field() is_below_trigger: boolean;
  @Field({ nullable: true }) last_allocation_period?: string;
  @Field(() => AiBillingSettingsResponse) settings: AiBillingSettingsResponse;
}

@ObjectType()
export class AiCreditLedgerEntry {
  @Field() id: string;
  @Field() event_type: string;
  @Field(() => Float) amount_usd: number;
  @Field(() => Float) balance_after: number;
  @Field({ nullable: true }) notes?: string;
  @Field() created_on: Date;
}

@ObjectType()
export class AiCreditPurchaseResponse {
  @Field() id: string;
  @Field(() => Int) company_id: number;
  @Field({ nullable: true }) company_name?: string;
  @Field(() => Float) credits_purchased_usd: number;
  @Field(() => Float) stripe_fee_usd: number;
  @Field(() => Float) amount_charged_usd: number;
  @Field() currency: string;
  @Field() status: string;
  @Field() trigger_type: string;
  @Field({ nullable: true }) stripe_payment_intent_id?: string;
  @Field({ nullable: true }) failure_reason?: string;
  @Field({ nullable: true }) receipt_pdf_url?: string;
  @Field() created_on: Date;
}

@ObjectType()
export class StripeSetupIntentResponse {
  @Field() client_secret: string;
  @Field() customer_id: string;
}

@ObjectType()
export class TopupResultResponse {
  @Field() purchase_id: string;
  @Field() status: string;
  @Field(() => Float) credits_purchased_usd: number;
  @Field(() => Float) amount_charged_usd: number;
  @Field(() => Float) stripe_fee_usd: number;
  @Field(() => Float) balance_after: number;
  @Field({ nullable: true }) client_secret?: string;
  @Field({ nullable: true }) failure_reason?: string;
}

@ObjectType()
export class AdminAiPurchasesCsvResponse {
  @Field() filename: string;
  @Field() csv: string;
  @Field(() => Int) row_count: number;
}

@ObjectType()
export class AdminAiPurchasesPageResponse {
  @Field(() => [AiCreditPurchaseResponse]) rows: AiCreditPurchaseResponse[];
  @Field(() => Int) total_count: number;
  @Field(() => Float) total_revenue_usd: number;
  @Field(() => Float) total_credits_sold_usd: number;
  @Field(() => Float) total_stripe_fees_usd: number;
}
