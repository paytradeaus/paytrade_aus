import { InputType, Field } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import {
  itemStatus,
  LimitType,
  UnitType,
} from 'src/entities/subscription-items.entity';
import { Group } from 'src/entities/user-details.entity';

@InputType({ description: 'Input type for adding a new subscription item.' })
export class AddSubscriptionItemInput {
  @Field({ description: 'Name of the subscription item.' })
  item_name: string;

  @Field({
    nullable: true,
    description: 'Optional description of the subscription item.',
  })
  description: string;

  @Field({ description: 'Current status of the subscription item.' })
  item_status: itemStatus;

  @Field({ description: 'Type of limit applied to the subscription item.' })
  limit_type: LimitType;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description:
      'Optional dropdown configuration for the item as a JSON object.',
  })
  dropdown_type: Record<string, any>;

  @Field({
    nullable: true,
    description: 'Unit type associated with the subscription item.',
  })
  unit_type: UnitType;

  @Field({
    nullable: true,
    description: 'User ID of the logged-in user who created this item.',
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
      'Group under which the record is created (User, Admin, System).',
  })
  created_group: Group;
}
