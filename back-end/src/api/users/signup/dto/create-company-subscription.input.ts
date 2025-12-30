import { InputType, Field } from '@nestjs/graphql';

@InputType({
  description:
    'Input payload used to assign or create a subscription plan for a business.',
})
export class CreateCompanySubscriptionInput {
  @Field({
    description:
      'Unique identifier of the business for which the subscription is being created.',
  })
  company_id: number;

  @Field({
    description:
      'Name of the subscription plan to be assigned to the business.',
  })
  plan_name: string;
}
