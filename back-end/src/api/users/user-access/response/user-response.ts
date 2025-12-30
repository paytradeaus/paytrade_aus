import { ObjectType, Field } from '@nestjs/graphql';
import { UserStatus } from 'src/entities/user-details.entity';
import { Permission } from '../dto/create-user-access.input';

@ObjectType({
  description:
    'Represents detailed information about a single user, including access permissions and business association.',
})
export class UserRes {
  @Field({
    nullable: true,
    description: 'Unique identifier for the user record.',
  })
  id: string;

  @Field({ nullable: true, description: 'Numeric ID of the user.' })
  user_id: number;

  @Field({ nullable: true, description: 'First name of the user.' })
  first_name: string;

  @Field({ nullable: true, description: 'Last name of the user.' })
  last_name: string;

  @Field({ nullable: true, description: 'Email address of the user.' })
  email_id: string;

  @Field({ nullable: true, description: 'Current status of the user account.' })
  user_status: UserStatus;

  @Field({
    nullable: true,
    description: 'Indicates whether the user has verified their email.',
  })
  is_verified: Boolean;

  @Field({
    nullable: true,
    description: `File path of the user's uploaded file, if any.`,
  })
  file_path: string;

  @Field({
    nullable: true,
    description: 'Original file name of the uploaded file, if any.',
  })
  file_name: string;

  @Field({ nullable: true, description: 'MIME type of the uploaded file.' })
  file_type: string;

  @Field({
    nullable: true,
    description: 'Base64 or URL representation of the file.',
  })
  file: string;

  @Field({
    nullable: true,
    description: 'ID of the business the user is associated with.',
  })
  company_id: number;

  @Field({ nullable: true, description: 'Username of the user.' })
  user_name: string;

  @Field({
    nullable: true,
    description: 'Type of the user (e.g., Admin, Basic User).',
  })
  user_type: string;

  @Field({
    nullable: true,
    description: 'Overall status of the user within the system.',
  })
  status: string;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the user was added.',
  })
  date_added: Date;

  @Field({
    nullable: true,
    description: 'Permission to manage project trust payments.',
  })
  manage_project_trust_payment: Permission;

  @Field({ nullable: true, description: 'Permission to manage other users.' })
  manage_user: Permission;

  @Field({
    nullable: true,
    description: 'Permission to manage business details.',
  })
  manage_company: Permission;

  @Field({ nullable: true, description: 'Permission to manage subscriptions.' })
  manage_subscription: Permission;
}

@ObjectType({
  description:
    'Standard API response for fetching a list of users with detailed information.',
})
export class UserResponse {
  @Field({ description: 'Status of the API response (e.g., SUCCESS, ERROR).' })
  status: string;

  @Field({ description: 'Message providing context about the API response.' })
  message: string;

  @Field(() => [UserRes], {
    nullable: true,
    description: 'Optional array of users returned by the query.',
  })
  data?: UserRes[];
}
