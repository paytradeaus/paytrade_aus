import { ObjectType, Field } from '@nestjs/graphql';
import { ApiStatusType } from 'src/libs/@response-framer/response-framer';

@ObjectType({
  description:
    'Access token returned when an admin successfully logs in as a user',
})
export class AllowAdminToLoginAsUser {
  @Field({ description: 'JWT access token for the impersonated user' })
  access_token: string;
}

@ObjectType({
  description: 'Standard response structure for admin login as user operation',
})
export class AllowAdminToLoginAsUserResponse {
  @Field({ description: 'Status of the operation (e.g., SUCCESS or FAILED)' })
  status: ApiStatusType;

  @Field({
    description: 'Message providing additional context about the operation',
  })
  message: string;

  @Field(() => AllowAdminToLoginAsUser, {
    nullable: true,
    description: 'Access token data if login was successful',
  })
  data?: AllowAdminToLoginAsUser;
}
