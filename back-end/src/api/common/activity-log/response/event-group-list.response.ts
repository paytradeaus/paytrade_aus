import { ObjectType, Field, Int } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';

@ObjectType({
  description: 'Represents an event group with a name and associated values.',
})
export class EventGroupRes {
  @Field({ description: 'Name of the event group.' })
  name: string;

  @Field(() => [Int], {
    description: 'Array of values associated with the event group.',
  })
  value: number[];
}

@ObjectType({ description: 'Wrapper for a list of event groups.' })
class EventGroupObj {
  @Field(() => [EventGroupRes], {
    nullable: true,
    description: 'List of event groups.',
  })
  list?: EventGroupRes[];

  @Field({ nullable: true, description: 'Total number of event groups.' })
  total_count?: number;
}

@ObjectType({ description: 'Response for fetching event groups.' })
export class EventGroupResponse {
  @Field({ description: 'Status of the API response.' })
  status: string;

  @Field({
    description: 'Message providing additional information about the response.',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Data payload containing event group list.',
  })
  data?: EventGroupObj;
}

@ObjectType({ description: 'Represents a user with an ID and username.' })
export class UsersListRes {
  @Field({ description: 'User ID.' })
  id: string;

  @Field({ description: 'Username of the user.' })
  user_name: string;
}

@ObjectType({ description: 'Response for fetching users list.' })
export class UsersListResponse {
  @Field({ description: 'Status of the API response.' })
  status: string;

  @Field({
    description: 'Message providing additional context about the response.',
  })
  message: string;

  @Field(() => [UsersListRes], {
    nullable: true,
    description: 'Array of users.',
  })
  data?: UsersListRes[];
}
