import { InputType, Field } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import {
  itemStatus,
  LimitType,
  UnitType,
} from 'src/entities/subscription-items.entity';
import { Group } from 'src/entities/user-details.entity';

@InputType({ description: 'Input to update an existing subscription item.' })
export class UpdateSubscriptionItemInput {
  @Field({ description: 'ID of the subscription item to update.' })
  id: string;

  @Field({ nullable: true, description: 'Name of the subscription item.' })
  item_name: string;

  @Field({
    nullable: true,
    description: 'Description of the subscription item.',
  })
  description: string;

  @Field({ nullable: true, description: 'Status of the subscription item.' })
  item_status: itemStatus;

  @Field({ description: 'Type of limit applied to the item.' })
  limit_type: LimitType;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Dropdown configuration for the item, if applicable.',
  })
  dropdown_type: Record<string, any>;

  @Field({
    nullable: true,
    description: 'Unit type associated with the item, if any.',
  })
  unit_type: UnitType;

  @Field({
    nullable: true,
    description: 'User ID of the person updating the item.',
  })
  updated_by: number;

  @Field({
    nullable: true,
    description: 'Timestamp when the subscription item was updated.',
  })
  updated_on: Date;

  @Field({
    nullable: true,
    description: 'Group under which the update was made (User, Admin, System).',
  })
  updated_group: Group;
}
