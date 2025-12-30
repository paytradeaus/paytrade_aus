import { Field, InputType } from '@nestjs/graphql';

@InputType({
  description: 'Input type for updating a business free plan eligibility',
})
export class UpdateBusinessFreeAccessInput {
  @Field({
    nullable: true,
    description: 'Indicates whether the business is eligible for the free plan',
  })
  is_free_plan_eligible?: boolean;

  @Field({
    nullable: true,
    description: 'Reason for free plan eligibility or ineligibility',
  })
  free_plan_reason?: string;

  @Field({ description: 'Unique ID of the company to update' })
  company_id: number;
}
