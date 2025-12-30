import { ObjectType, Field } from '@nestjs/graphql';
import { UserAccessResponse } from './user-access.response';

@ObjectType({
  description:
    'Contains a list of users along with the total count and optional pending invitations.',
})
export class UserListRes {
  @Field(() => [UserAccessResponse], {
    nullable: true,
    description: 'Array of user access details.',
  })
  user_list: UserAccessResponse[];

  @Field({ description: 'Total number of users in the list.' })
  total_count: number;

  @Field({
    nullable: true,
    description: 'Optional count of pending invitations for this business.',
  })
  pending_invitations?: number;
}

@ObjectType({
  description: 'Standard API response for fetching a list of users.',
})
export class UserListResponse {
  @Field({ description: 'Status of the API response (e.g., SUCCESS, ERROR).' })
  status: string;

  @Field({
    description: 'Message providing additional context about the response.',
  })
  message: string;

  @Field({
    nullable: true,
    description:
      'Optional data containing the list of users and related information.',
  })
  data?: UserListRes;
}
