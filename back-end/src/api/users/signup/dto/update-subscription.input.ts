import { Group } from 'src/entities/user-details.entity';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import { CreateSubscriptionInput } from './create-subscription.input';

@InputType({
  description:
    'Input payload used to update an existing business subscription. Supports partial updates of subscription details.',
})
export class UpdateSubscriptionInput extends PartialType(
  CreateSubscriptionInput,
) {
  @Field({
    description: 'Unique identifier of the subscription to be updated.',
  })
  id: string;

  @Field({
    nullable: true,
    description: 'User ID of the logged in user performing the update.',
  })
  updated_by: number;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the subscription was updated.',
  })
  updated_on: Date;

  @Field({
    nullable: true,
    description:
      'Group (User, Admin, System) under which the subscription was updated.',
  })
  updated_group: Group;
}
