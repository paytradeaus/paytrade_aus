import { InputType, Field, Int } from '@nestjs/graphql';
import { PlanStatus } from 'src/entities/subscription-plan-details.entity';

@InputType({ description: 'Input to update an existing subscription plan.' })
export class UpdateSubscriptionPlanInput {
  @Field({ description: 'ID of the subscription plan to update.' })
  id: string;

  @Field({
    nullable: true,
    description: 'Description of the subscription plan.',
  })
  description: string;

  @Field({
    description:
      'Status of the subscription plan. Paid plans are always active.',
  })
  plan_status: PlanStatus;

  @Field({
    nullable: true,
    description: 'Monthly price of the subscription plan, if applicable.',
  })
  monthly_price: number;

  @Field({
    nullable: true,
    description: 'Yearly price of the subscription plan, if applicable.',
  })
  yearly_price: number;

  @Field({
    nullable: true,
    description: 'Trial period in days for the subscription plan.',
  })
  trial_period: number;

  @Field(() => [String], {
    nullable: true,
    description: 'IDs of the items associated with the subscription plan.',
  })
  itemIds: string[];

  @Field(() => [UpdateItemInput], {
    nullable: true,
    description: 'Specifications of each subscription item within the plan.',
  })
  item_specification: UpdateItemInput[];

  @Field({
    nullable: true,
    description:
      'Timestamp indicating when the subscription plan was last updated.',
  })
  updated_on: Date;

  @Field({
    nullable: true,
    description: 'Timezone for the subscription plan settings.',
  })
  timezone: string;
}

@InputType({
  description: 'Input to update a subscription item within a plan.',
})
export class UpdateItemInput {
  @Field({ nullable: true, description: 'ID of the subscription item.' })
  item_id: string;

  @Field({
    nullable: true,
    description: 'Limit value associated with the subscription item.',
  })
  limit_value: string;

  @Field({
    nullable: true,
    description: 'Whether the subscription item is unlimited.',
  })
  is_unlimited: Boolean;
}
