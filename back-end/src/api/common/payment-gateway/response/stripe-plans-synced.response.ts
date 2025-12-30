import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType({ description: 'Represents a single subscription plan option' })
export class PlanResponse {
  @Field({ description: 'Label or display name of the plan' })
  label: string;

  @Field({ description: 'Internal value or identifier of the plan' })
  value: string;
}

@ObjectType({ description: 'Response containing a list of subscription plans' })
export class GetSubscriptionPlansResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field(() => [PlanResponse], {
    nullable: true,
    description: 'List of available subscription plans',
  })
  data: PlanResponse[];
}
