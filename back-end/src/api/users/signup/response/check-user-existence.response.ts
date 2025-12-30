import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType({
  description: 'Represents the details of a user if they exist in the system.',
})
export class CheckUserExistenceRes {
  @Field({ description: 'Primary email address of the user.' })
  email_id: string;

  @Field({
    nullable: true,
    description:
      'Current status of the user (e.g., Active, Inactive, Pending).',
  })
  user_status: string;

  @Field({
    nullable: true,
    description: 'Indicates whether the user has verified their email.',
  })
  is_verified: boolean;

  @Field({
    nullable: true,
    description: 'Timestamp of the last time the user logged into the system.',
  })
  last_logged_in: Date;
}

@ObjectType({
  description:
    'Response returned after checking whether a user exists in the system.',
})
export class CheckUserExistenceResponse {
  @Field({ description: 'Status of the request, e.g., SUCCESS or ERROR.' })
  status: string;

  @Field({ description: 'Message describing the result of the check.' })
  message: string;

  @Field(() => [CheckUserExistenceRes], {
    nullable: true,
    description: 'List of user details matching the check criteria.',
  })
  data?: CheckUserExistenceRes[];
}
