import { ObjectType, Field, Float } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import {
  CouponStatus,
  StripeCouponDurationType,
} from 'src/entities/subscription-coupon.entity';
import { SignatureType } from 'src/entities/subscription-details.entity';
import {
  itemStatus,
  LimitType,
  UnitType,
} from 'src/entities/subscription-items.entity';
import {
  PlanStatus,
  PlanType,
} from 'src/entities/subscription-plan-details.entity';
import { BillCycle } from 'src/entities/subscription-pricing-plan.entity';

@ObjectType({
  description: 'Represents a single item within a subscription plan',
})
export class SubscriptionItem {
  @Field({ description: 'Unique identifier of the subscription item' })
  id: string;

  @Field({
    description:
      'Identifier of the plan item associated with this subscription item',
  })
  plan_item_id: string;

  @Field({ description: 'Identifier of the actual item' })
  item_id: number;

  @Field({ description: 'Name of the subscription item' })
  item_name: string;

  @Field({
    nullable: true,
    description: 'Optional description of the subscription item',
  })
  description: string;

  @Field({ description: 'Current status of the subscription item' })
  item_status: itemStatus;

  @Field({ description: 'Limit type applied to the subscription item' })
  limit_type: LimitType;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Dropdown configuration for the item, if applicable',
  })
  dropdown_type: Record<string, any>;

  @Field({
    nullable: true,
    description: 'Unit type associated with the item, if any',
  })
  unit_type: UnitType;

  @Field({
    nullable: true,
    description: 'Limit value of the subscription item, if applicable',
  })
  limit_value: string;

  @Field({
    nullable: true,
    description: 'Indicates if the subscription item has unlimited usage',
  })
  is_unlimited: Boolean;
}

@ObjectType({ description: 'Detailed information about a subscription' })
export class GetSubscriptionDetails {
  @Field({ description: 'Unique identifier of the subscription record' })
  id: string;

  @Field({ description: 'Internal subscription identifier' })
  subscription_id: number;

  @Field({ description: 'Company identifier associated with the subscription' })
  company_id: number;

  @Field({ description: 'Company name associated with the subscription' })
  company_name: string;

  @Field({
    nullable: true,
    description: 'Identifier of the plan linked to the subscription',
  })
  plan_id: number;

  @Field({
    nullable: true,
    description: 'Price ID associated with the subscription plan',
  })
  price_id: number;

  @Field({ description: 'Subscription amount' })
  amount: string;

  @Field({
    nullable: true,
    description: 'Start date of the subscription period',
  })
  start_date: Date;

  @Field({
    nullable: true,
    description: 'Expiry date of the subscription period',
  })
  expiry_date: Date;

  @Field({ description: 'Status of the subscription' })
  status: string;

  @Field({ nullable: true, description: 'Stripe customer identifier' })
  stripe_customer_id: string;

  @Field({
    nullable: true,
    description: 'Payment method identifier used for the subscription',
  })
  payment_method_id: string;

  @Field({ nullable: true, description: 'Stripe subscription identifier' })
  stripe_subscription_id: string;

  @Field({ nullable: true, description: 'Trial start date, if applicable' })
  trial_start: Date;

  @Field({ nullable: true, description: 'Trial end date, if applicable' })
  trial_end: Date;

  @Field({
    nullable: true,
    description: 'Date when the subscription was canceled, if applicable',
  })
  canceled_at: Date;

  @Field({ nullable: true, description: 'Name of the subscription plan' })
  plan_name: string;

  @Field({ nullable: true, description: 'Type of subscription plan' })
  plan_type: PlanType;

  @Field({ nullable: true, description: 'Status of the subscription plan' })
  plan_status: PlanStatus;

  @Field({ nullable: true, description: 'Trial period duration in days' })
  trial_period: number;

  @Field({
    nullable: true,
    description: 'Name on the card used for subscription payments',
  })
  name_on_card: string;

  @Field({ nullable: true, description: 'Type of card used' })
  card_type: string;

  @Field({ nullable: true, description: 'Last four digits of the card used' })
  last_four_digits: string;

  @Field({ nullable: true, description: 'Expiry month of the card' })
  expiry_month: number;

  @Field({ nullable: true, description: 'Expiry year of the card' })
  expiry_year: number;

  @Field({
    nullable: true,
    description: 'Indicates if this is the default payment method',
  })
  is_default: boolean;

  @Field({
    nullable: true,
    description: 'Indicates if upgrade plans are available',
  })
  has_upgrade_plans: boolean;

  @Field({
    nullable: true,
    description: 'Indicates if annual billing is enabled',
  })
  has_annual_billing: boolean;

  @Field({ nullable: true, description: 'Annual price ID, if applicable' })
  annual_price_id: number;

  @Field({ nullable: true, description: 'Billing cycle of the subscription' })
  bill_cycle: BillCycle;

  @Field({
    nullable: true,
    description: 'Annual price amount as formatted string',
  })
  annual_price_amount: string;

  @Field({
    nullable: true,
    description: 'Annual price amount as a number without formatting',
  })
  unformatted_annual_price_amount: number;

  @Field({
    nullable: true,
    description: 'Signature string for subscription validation, if any',
  })
  signature: string;

  @Field({ nullable: true, description: 'Type of signature provided' })
  signature_type: SignatureType;

  @Field({
    nullable: true,
    description: 'Coupon name applied to the subscription, if any',
  })
  coupon_name: string;

  @Field({ nullable: true, description: 'Duration type of the coupon applied' })
  duration: StripeCouponDurationType;

  @Field({
    nullable: true,
    description: 'Percentage discount applied via coupon',
  })
  percent_off: number;

  @Field({
    nullable: true,
    description: 'Number of months the coupon is valid for',
  })
  duration_in_months: number;

  @Field({ nullable: true, description: 'Status of the coupon applied' })
  coupon_status: CouponStatus;

  @Field({ nullable: true, description: 'Identifier of the applied coupon' })
  coupon_id: number;

  @Field({
    nullable: true,
    description: 'Indicates if the subscription is eligible for a free plan',
  })
  is_free_plan_eligible?: boolean;

  @Field({
    nullable: true,
    description: 'Reason why the subscription is eligible for a free plan',
  })
  free_plan_reason?: string;

  @Field(() => [SubscriptionItem], {
    nullable: true,
    description: 'List of items included in the subscription plan',
  })
  plan_items: SubscriptionItem[];
}

@ObjectType({
  description: 'Response wrapper for fetching subscription details',
})
export class GetSubscriptionDetailsResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({
    nullable: true,
    description: 'Detailed subscription information payload',
  })
  data?: GetSubscriptionDetails;
}
