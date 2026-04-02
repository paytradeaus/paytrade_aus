import { InputType, Field, Int } from '@nestjs/graphql';
import { SubsciptionPlanStatus } from 'src/entities/subscription-details.entity';
import {
  PlanStatus,
  PlanType,
} from 'src/entities/subscription-plan-details.entity';

@InputType({ description: 'Input for adding a new subscription plan.' })
export class AddSubscriptionPlanInput {
  @Field({ description: 'Name of the subscription plan.' })
  plan_name: string;

  @Field({ nullable: true, description: 'Optional description of the plan.' })
  description: string;

  @Field({ description: 'Type of subscription plan (e.g., Paid, Free).' })
  plan_type: PlanType;

  @Field({ description: 'Status of the plan. Always active for paid plans.' })
  plan_status: PlanStatus;

  @Field({
    nullable: true,
    description: 'Monthly price for the plan (if applicable).',
  })
  monthly_price: number;

  @Field({
    nullable: true,
    description: 'Yearly price for the plan (if applicable).',
  })
  yearly_price: number;

  @Field({
    nullable: true,
    description: 'Trial period in days (if applicable).',
  })
  trial_period: number;

  @Field(() => [String], {
    nullable: true,
    description: 'List of item IDs included in this plan.',
  })
  itemIds: string[];

  @Field(() => [AddItemInput], {
    nullable: true,
    description: 'Detailed item specifications included in the plan.',
  })
  item_specification: AddItemInput[];

  @Field({
    nullable: true,
    defaultValue: false,
    description: 'Whether this plan uses Stripe sandbox/test mode.',
  })
  is_sandbox: boolean;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the plan was created.',
  })
  created_on: Date;

  @Field({
    nullable: true,
    description: 'Timezone of the plan creator or relevant for plan display.',
  })
  timezone: string;
}

@InputType({
  description: 'Input to define an item within a subscription plan.',
})
export class AddItemInput {
  @Field({ nullable: true, description: 'ID of the subscription item.' })
  item_id: string;

  @Field({ nullable: true, description: 'Limit value for the item.' })
  limit_value: string;

  @Field({
    nullable: true,
    description: 'Whether the item has unlimited usage.',
  })
  is_unlimited: Boolean;
}

@InputType({
  description:
    'Input to retrieve all subscription plans with optional filters.',
})
export class GetAllSubscriptionPlanInput {
  @Field({
    defaultValue: null,
    nullable: true,
    description: 'Page number for pagination.',
  })
  page_number?: number;

  @Field({
    defaultValue: null,
    nullable: true,
    description: 'Number of items per page for pagination.',
  })
  page_size?: number;

  @Field({ nullable: true, description: 'Filter plans by type.' })
  plan_type?: PlanType;

  @Field({ nullable: true, description: 'Filter plans by status.' })
  status?: PlanStatus;

  @Field({ nullable: true, description: 'Search keyword to filter plans.' })
  search?: string;

  @Field({
    nullable: true,
    description: 'Filter sandbox or live plans. Omit to see all.',
  })
  is_sandbox?: boolean;

  @Field({
    nullable: true,
    description: 'Whether to sort plans alphabetically.',
  })
  is_alphabetical_order?: boolean;

  @Field({ nullable: true, description: 'Field to sort the results by.' })
  sorting_field?: string;

  @Field({ nullable: true, description: 'Sorting order: ASC or DESC.' })
  sorting_order?: 'ASC' | 'DESC';
}

@InputType({
  description:
    'Input to retrieve all users subscribed to plans with optional filters.',
})
export class GetAllSubscribedUsersInput {
  @Field({
    defaultValue: null,
    nullable: true,
    description: 'Page number for pagination.',
  })
  page_number?: number;

  @Field({
    defaultValue: null,
    nullable: true,
    description: 'Number of users per page for pagination.',
  })
  page_size?: number;

  @Field({ nullable: true, description: 'Filter users by company ID.' })
  company_id: number;

  @Field({
    nullable: true,
    description: 'Filter users by subscription status.',
  })
  status?: SubsciptionPlanStatus;

  @Field({ nullable: true, description: 'Search keyword to filter users.' })
  search?: string;

  @Field({
    nullable: true,
    description:
      'Filter users by date range: "created" or "subscription" date.',
  })
  date_filter: string;

  @Field({ nullable: true, description: 'Start date for filtering users.' })
  start_date: Date;

  @Field({ nullable: true, description: 'End date for filtering users.' })
  end_date: Date;

  @Field({
    nullable: true,
    description: 'Timezone to apply when filtering by dates.',
  })
  timezone: string;

  @Field({ nullable: true, description: 'Field to sort the user list by.' })
  sorting_field?: string;

  @Field({ nullable: true, description: 'Sorting order: ASC or DESC.' })
  sorting_order?: 'ASC' | 'DESC';
}
