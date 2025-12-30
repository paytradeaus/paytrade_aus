import { ObjectType, Field } from '@nestjs/graphql';
import { PTUser } from './pt-user.response';

@ObjectType({ description: 'List of users with total count' })
export class PTUserList {
  @Field(() => [PTUser], {
    nullable: true,
    description: 'Array of user details',
  })
  users: PTUser[];

  @Field({ description: 'Total number of users available' })
  totalCount: number;
}

@ObjectType({ description: 'Response containing a list of users' })
export class PTUserListResponse {
  @Field({ description: 'Status of the API response, e.g., SUCCESS or FAILED' })
  status: string;

  @Field({
    description: 'Message providing additional information about the response',
  })
  message: string;

  @Field({ nullable: true, description: 'List of users with total count' })
  data?: PTUserList;
}
