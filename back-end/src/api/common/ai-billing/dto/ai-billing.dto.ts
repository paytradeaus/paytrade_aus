import { Field, Float, InputType, Int } from '@nestjs/graphql';

@InputType({ description: 'Filter for the admin AI credit purchases page.' })
export class AdminAiPurchasesFilterInput {
  @Field({ nullable: true })
  start_date?: Date;

  @Field({ nullable: true })
  end_date?: Date;

  @Field(() => Int, { nullable: true })
  company_id?: number;

  @Field({ nullable: true, description: 'pending|succeeded|failed|refunded' })
  status?: string;

  @Field(() => Float, { nullable: true })
  min_amount?: number;

  @Field(() => Float, { nullable: true })
  max_amount?: number;

  @Field(() => Int, { nullable: true })
  page_number?: number;

  @Field(() => Int, { nullable: true })
  page_size?: number;
}

@InputType({ description: 'Update auto top-up + low-balance settings for a company.' })
export class UpdateAiBillingSettingsInput {
  @Field({ nullable: true })
  auto_topup_enabled?: boolean;

  @Field(() => Float, { nullable: true })
  low_balance_trigger_usd?: number;

  @Field(() => Float, { nullable: true })
  topup_amount_usd?: number;

  @Field(() => Float, { nullable: true })
  monthly_topup_cap_usd?: number;

  @Field({ nullable: true })
  billing_email?: string;
}

@InputType({ description: 'Trigger a one-off (manual) AI credit top-up.' })
export class ManualTopupInput {
  @Field(() => Float, { description: 'Credit value (USD) to add to the balance.' })
  credits_usd: number;

  @Field({ nullable: true, defaultValue: false })
  is_sandbox?: boolean;
}

@InputType({ description: 'Attach a Stripe payment method to the company for AI billing.' })
export class AttachPaymentMethodInput {
  @Field()
  payment_method_id: string;

  @Field({ nullable: true, defaultValue: false })
  is_sandbox?: boolean;
}
