import { ObjectType, Field, Int } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import {
  itemStatus,
  LimitType,
  UnitType,
} from 'src/entities/subscription-items.entity';

@ObjectType({ description: 'Details of a subscription item.' })
export class PtSubscriptionItem {
  @Field({ description: 'Unique ID of the subscription item.' })
  id: string;

  @Field({ description: 'Name of the subscription item.' })
  item_name: string;

  @Field({
    nullable: true,
    description: 'Description of the subscription item.',
  })
  description: string;

  @Field({ description: 'Status of the subscription item.' })
  item_status: itemStatus;

  @Field({ description: 'Type of limit for the subscription item.' })
  limit_type: LimitType;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description:
      'Dropdown configuration for the subscription item, if applicable.',
  })
  dropdown_type: Record<string, any>;

  @Field({
    nullable: true,
    description: 'Unit type associated with the subscription item.',
  })
  unit_type: UnitType;
}

@ObjectType({ description: 'Response containing a single subscription item.' })
export class PtSubscriptionItemResponse {
  @Field({ description: 'Status of the response.' })
  status: string;

  @Field({ description: 'Message describing the response.' })
  message: string;

  @Field({ nullable: true, description: 'Subscription item data.' })
  data?: PtSubscriptionItem;
}

@ObjectType({ description: 'List of subscription items.' })
export class PtSubscriptionItemList {
  @Field(() => [PtSubscriptionItem], {
    nullable: true,
    description: 'Array of subscription items.',
  })
  subscriptionItems: PtSubscriptionItem[];

  @Field(() => Int, { description: 'Total number of subscription items.' })
  totalCount: number;
}

@ObjectType({
  description: 'Response containing a list of subscription items.',
})
export class PtSubscriptionItemListResponse {
  @Field({ description: 'Status of the response.' })
  status: string;

  @Field({ description: 'Message describing the response.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing subscription item list and count.',
  })
  data?: PtSubscriptionItemList;
}
