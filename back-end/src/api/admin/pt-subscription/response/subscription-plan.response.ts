import { ObjectType, Field, Int } from '@nestjs/graphql';
import {
  itemStatus,
  LimitType,
  UnitType,
} from 'src/entities/subscription-items.entity';
import {
  BillCycle,
  PlanStatus,
} from 'src/entities/subscription-pricing-plan.entity';
import { PlanType } from 'src/entities/subscription-plan-details.entity';
import { SubsciptionPlanStatus } from 'src/entities/subscription-details.entity';
import { GraphQLJSONObject } from 'graphql-type-json';

@ObjectType({
  description: 'Basic information about a subscription item in a plan.',
})
export class PtSubscriptionItemBasicResponse {
  @Field({ description: 'Unique ID of the subscription item record.' })
  id: string;

  @Field({ description: 'ID of the plan item.' })
  plan_item_id: string;

  @Field({ description: 'ID of the subscription item.' })
  item_id: number;

  @Field({ description: 'Name of the subscription item.' })
  item_name: string;

  @Field({
    nullable: true,
    description: 'Description of the subscription item.',
  })
  description: string;

  @Field({ description: 'Status of the subscription item.' })
  item_status: itemStatus;

  @Field({ description: 'Limit type for the subscription item.' })
  limit_type: LimitType;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description:
      'Dropdown configuration for the subscription item, if applicable.',
  })
  dropdown_type: Record<string, any>;

  @Field({
    nullable: true,
    description: 'Unit type associated with the subscription item.',
  })
  unit_type: UnitType;

  @Field({ nullable: true, description: 'Limit value of the item.' })
  limit_value: string;

  @Field({
    nullable: true,
    description: 'Whether the item has unlimited usage.',
  })
  is_unlimited: Boolean;
}

@ObjectType({ description: 'Subscription plan metadata.' })
export class PtSubscriptionPlan {
  @Field({ description: 'Unique ID of the subscription plan record.' })
  id: string;

  @Field({ description: 'ID of the plan.' })
  plan_id: number;

  @Field({
    nullable: true,
    description: 'Stripe product ID associated with the plan.',
  })
  stripe_product_id: string;

  @Field({ description: 'Name of the subscription plan.' })
  plan_name: string;

  @Field({
    nullable: true,
    description: 'Description of the subscription plan.',
  })
  description: string;

  @Field({ description: 'Type of the plan (monthly, yearly, etc.).' })
  plan_type: PlanType;

  @Field({ description: 'Status of the subscription plan.' })
  plan_status: PlanStatus;
}

@ObjectType({ description: 'Response containing a single subscription plan.' })
export class PtSubscriptionPlanResponse {
  @Field({ description: 'Status of the response.' })
  status: string;

  @Field({ description: 'Message describing the response.' })
  message: string;

  @Field({ nullable: true, description: 'Subscription plan data.' })
  data?: PtSubscriptionPlan;
}

@ObjectType({
  description: 'Full subscription plan details including items and pricing.',
})
export class SubscriptionPlan {
  @Field({ description: 'Unique ID of the subscription plan record.' })
  id: string;

  @Field({ description: 'ID of the plan.' })
  plan_id: number;

  @Field({
    nullable: true,
    description: 'Stripe product ID associated with the plan.',
  })
  stripe_product_id: string;

  @Field({ description: 'Name of the subscription plan.' })
  plan_name: string;

  @Field({
    nullable: true,
    description: 'Description of the subscription plan.',
  })
  description: string;

  @Field({ description: 'Type of the plan (monthly, yearly, etc.).' })
  plan_type: PlanType;

  @Field({ description: 'Status of the plan.' })
  plan_status: PlanStatus;

  @Field({ nullable: true, description: 'ID of the monthly pricing record.' })
  monthly_price_id: number;

  @Field({ nullable: true, description: 'ID of the yearly pricing record.' })
  yearly_price_id: number;

  @Field({
    nullable: true,
    description: 'Stripe price ID for the monthly plan.',
  })
  monthly_stripe_price_id: string;

  @Field({
    nullable: true,
    description: 'Stripe price ID for the yearly plan.',
  })
  yearly_stripe_price_id: string;

  @Field({ nullable: true, description: 'Name of the monthly pricing.' })
  monthly_price_name: string;

  @Field({ nullable: true, description: 'Name of the yearly pricing.' })
  yearly_price_name: string;

  @Field({ nullable: true, description: 'Billing cycle of the monthly plan.' })
  monthly_bill_cycle: BillCycle;

  @Field({ nullable: true, description: 'Billing cycle of the yearly plan.' })
  yearly_bill_cycle: BillCycle;

  @Field({ nullable: true, description: 'Formatted monthly price.' })
  monthly_price: string;

  @Field({ nullable: true, description: 'Formatted yearly price.' })
  yearly_price: string;

  @Field({ nullable: true, description: 'Raw numeric value of monthly price.' })
  unformatted_monthly_price: number;

  @Field({ nullable: true, description: 'Raw numeric value of yearly price.' })
  unformatted_yearly_price: number;

  @Field({ nullable: true, description: 'Trial period in days.' })
  trial_period: number;

  @Field({ nullable: true, description: 'Whether the monthly plan is active.' })
  monthly_is_active: boolean;

  @Field({ nullable: true, description: 'Whether the yearly plan is active.' })
  yearly_is_active: boolean;

  @Field({
    nullable: true,
    description: 'Whether the monthly plan is deleted.',
  })
  monthly_is_deleted: boolean;

  @Field({ nullable: true, description: 'Whether the yearly plan is deleted.' })
  yearly_is_deleted: boolean;

  @Field(() => [PtSubscriptionItemBasicResponse], {
    nullable: true,
    description: 'List of subscription items in this plan.',
  })
  plan_items: PtSubscriptionItemBasicResponse[];

  @Field({ nullable: true, description: 'Whether this is a sandbox/test plan.' })
  is_sandbox?: boolean;

  @Field({
    nullable: true,
    description:
      'Monthly AI credit allotment (USD) granted to companies on this plan.',
  })
  monthly_ai_credit?: number;
}

@ObjectType({ description: 'Response containing subscription plan details.' })
export class SubscriptionPricingPlanResponse {
  @Field({ description: 'Status of the response.' })
  status: string;

  @Field({ description: 'Message describing the response.' })
  message: string;

  @Field({ nullable: true, description: 'Subscription plan data.' })
  data?: SubscriptionPlan;
}

@ObjectType({ description: 'List of subscription plans.' })
export class SubscriptionPlanList {
  @Field(() => [SubscriptionPlan], {
    nullable: true,
    description: 'Array of subscription plans.',
  })
  plan_list: SubscriptionPlan[] = [];

  @Field(() => Int, { description: 'Total number of plans.' })
  total_count: number;
}

@ObjectType({ description: 'Response containing list of subscription plans.' })
export class SubscriptionPlanListResponse {
  @Field({ description: 'Status of the response.' })
  status: string;

  @Field({ description: 'Message describing the response.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing subscription plan list and count.',
  })
  data?: SubscriptionPlanList;
}

@ObjectType({
  description: 'Response indicating existence of subscription plans.',
})
export class CheckPlanExistenceResponse {
  @Field({ description: 'Status of the response.' })
  status: string;

  @Field({ description: 'Message describing the response.' })
  message: string;

  @Field(() => [PtSubscriptionPlan], {
    nullable: true,
    description: 'Array of subscription plans found.',
  })
  data?: PtSubscriptionPlan[];
}

@ObjectType({
  description: 'Subscription plan information tailored for a user.',
})
export class SubscriptionPlanForUser {
  @Field({ description: 'Unique ID of the subscription plan record.' })
  id: string;

  @Field({ description: 'ID of the plan.' })
  plan_id: number;

  @Field({
    nullable: true,
    description: 'Stripe product ID associated with the plan.',
  })
  stripe_product_id: string;

  @Field({ description: 'Name of the plan.' })
  plan_name: string;

  @Field({ nullable: true, description: 'Description of the plan.' })
  description: string;

  @Field({ description: 'Type of the plan (monthly, yearly, etc.).' })
  plan_type: PlanType;

  @Field({ description: 'Status of the plan.' })
  plan_status: PlanStatus;

  @Field({
    nullable: true,
    description: 'Price ID associated with the plan for this user.',
  })
  price_id: number;

  @Field({ nullable: true, description: 'Stripe price ID for this plan.' })
  stripe_price_id: string;

  @Field({ nullable: true, description: 'Name of the price.' })
  price_name: string;

  @Field({ nullable: true, description: 'Billing cycle for this plan.' })
  bill_cycle: BillCycle;

  @Field({ nullable: true, description: 'Formatted price.' })
  price: string;

  @Field({ nullable: true, description: 'Raw numeric price value.' })
  unformatted_price: number;

  @Field({ nullable: true, description: 'Trial period in days.' })
  trial_period: number;

  @Field({
    nullable: true,
    description: 'Whether this plan is currently active.',
  })
  is_active: boolean;

  @Field({ nullable: true, description: 'Whether this plan is deleted.' })
  is_deleted: boolean;

  @Field(() => [PtSubscriptionItemBasicResponse], {
    nullable: true,
    description: 'Items associated with this plan.',
  })
  plan_items: PtSubscriptionItemBasicResponse[];

  @Field({
    nullable: true,
    description:
      'Monthly AI credit allotment (USD) granted to companies on this plan.',
  })
  monthly_ai_credit?: number;
}

@ObjectType({ description: 'Lists of subscription plans available to a user.' })
export class SubscriptionPlanListForUser {
  @Field({ nullable: true, description: 'Free plan available to the user.' })
  free_plan: SubscriptionPlanForUser;

  @Field(() => [SubscriptionPlanForUser], {
    nullable: true,
    description: 'Monthly plans available to the user.',
  })
  monthly_plan_list: SubscriptionPlanForUser[] = [];

  @Field(() => [SubscriptionPlanForUser], {
    nullable: true,
    description: 'Yearly plans available to the user.',
  })
  yearly_plan_list: SubscriptionPlanForUser[] = [];
}

@ObjectType({
  description: 'Response containing subscription plans available to a user.',
})
export class SubscriptionPlanListForUserResponse {
  @Field({ description: 'Status of the response.' })
  status: string;

  @Field({ description: 'Message describing the response.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing subscription plans for the user.',
  })
  data?: SubscriptionPlanListForUser;
}

@ObjectType({ description: 'Details of users subscribed to a plan.' })
export class SubscribedUsers {
  @Field({ description: 'Unique ID of the subscription record.' })
  id: string;

  @Field({ description: 'Subscription ID.' })
  subscription_id: number;

  @Field({ description: 'Company ID of the subscribed user.' })
  company_id: number;

  @Field({ description: 'Plan ID of the subscribed plan.' })
  plan_id: number;

  @Field({ description: 'Price ID associated with the subscription.' })
  price_id: number;

  @Field({ description: 'Subscribed amount formatted.' })
  subscribed_amount: string;

  @Field({ description: 'Subscribed amount numeric value.' })
  unformatted_subscribed_amount: number;

  @Field({ description: 'Status of the subscription.' })
  subscription_status: SubsciptionPlanStatus;

  @Field({ nullable: true, description: 'Start date of the subscription.' })
  start_date: Date;

  @Field({ nullable: true, description: 'Expiry date of the subscription.' })
  expiry_date: Date;

  @Field({ nullable: true, description: 'Trial start date, if applicable.' })
  trial_start: Date;

  @Field({ nullable: true, description: 'Trial end date, if applicable.' })
  trial_end: Date;

  @Field({
    nullable: true,
    description: 'Stripe customer ID associated with the subscription.',
  })
  stripe_customer_id: string;

  @Field({
    nullable: true,
    description: 'Payment method ID used for the subscription.',
  })
  payment_method_id: string;

  @Field({
    nullable: true,
    description: 'Cancellation date of the subscription, if applicable.',
  })
  canceled_at: Date;

  @Field({ description: 'Company name of the subscriber.' })
  company_name: string;

  @Field({ description: 'Company email ID of the subscriber.' })
  company_email_id: string;

  @Field({ description: 'Name of the subscribed plan.' })
  plan_name: string;

  @Field({ description: 'Status of the subscribed plan.' })
  plan_status: PlanStatus;

  @Field({
    nullable: true,
    description: 'Stripe price ID for the subscription.',
  })
  stripe_price_id: string;

  @Field({ nullable: true, description: 'Billing cycle of the subscription.' })
  bill_cycle: BillCycle;

  @Field({ nullable: true, description: 'Price of the subscription.' })
  plan_price: number;

  @Field({ nullable: true, description: 'Trial period in days.' })
  trial_period: number;

  @Field({
    nullable: true,
    description: 'Monthly AI credit allotment included with the plan (NZD).',
  })
  monthly_ai_credit: number;
}

@ObjectType({ description: 'List of subscribed users.' })
export class SubscribedUsersList {
  @Field(() => [SubscribedUsers], {
    nullable: true,
    description: 'Array of subscribed users.',
  })
  user_list: SubscribedUsers[] = [];

  @Field(() => Int, { description: 'Total number of subscribed users.' })
  total_count: number;
}

@ObjectType({ description: 'Response containing a list of subscribed users.' })
export class SubscribedUsersListResponse {
  @Field({ description: 'Status of the response.' })
  status: string;

  @Field({ description: 'Message describing the response.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing subscribed users list and count.',
  })
  data?: SubscribedUsersList;
}
