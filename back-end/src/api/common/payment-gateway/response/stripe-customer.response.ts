import { ObjectType, Field } from '@nestjs/graphql';
import { AuthRes } from 'src/api/users/signup/response/auth.response';
import { SubsciptionPlanStatus } from 'src/entities/subscription-details.entity';

@ObjectType({
  description: 'Detailed information about a company subscription',
})
export class SubscriptionDetails {
  @Field({ description: 'Unique identifier of the subscription record' })
  id: string;

  @Field({ description: 'Internal subscription identifier' })
  subscription_id: number;

  @Field({
    description: 'Identifier of the company associated with this subscription',
  })
  company_id: number;

  @Field({ description: 'Identifier of the plan linked to the subscription' })
  plan_id: number;

  @Field({ description: 'Current status of the subscription plan' })
  status: SubsciptionPlanStatus;

  @Field({
    nullable: true,
    description:
      'Optional authentication token associated with the subscription',
  })
  token: AuthRes;
}

@ObjectType({
  description: 'Response wrapper for fetching subscription details',
})
export class SubscriptionDetailsResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({ nullable: true, description: 'Subscription details payload' })
  data?: SubscriptionDetails;
}
