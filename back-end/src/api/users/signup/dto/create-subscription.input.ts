import { InputType, Field } from '@nestjs/graphql';
import { Group } from 'src/entities/user-details.entity';

@InputType({
  description:
    'Input payload used to create or assign a subscription plan to a business.',
})
export class CreateSubscriptionInput {
  @Field({
    description: 'Unique identifier of the business.',
  })
  company_id: number;

  @Field({
    nullable: true,
    description: 'Subscription plan identifier.',
  })
  plan_id: number;

  @Field({
    nullable: true,
    description: 'Pricing identifier associated with the subscription plan.',
  })
  price_id: number;

  @Field({
    nullable: true,
    description: 'Subscription amount to be charged.',
  })
  amount: number;

  @Field({
    nullable: true,
    description: 'Subscription start date.',
  })
  start_date: Date;

  @Field({
    nullable: true,
    description: 'User ID of the logged in user.',
  })
  created_by: number;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the record was created.',
  })
  created_on: Date;

  @Field({
    nullable: true,
    description:
      'Group (User, Admin, System) under which the record is created.',
  })
  created_group: Group;
}
