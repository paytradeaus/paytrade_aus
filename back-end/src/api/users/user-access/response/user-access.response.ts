import { ObjectType, Field } from '@nestjs/graphql';
import { UserStatus } from 'src/entities/user-details.entity';
import { Permission } from '../dto/create-user-access.input';

@ObjectType({
  description: `Represents a user's access details within a business, including permissions and status.`,
})
export class UserAccessResponse {
  @Field({ description: 'Unique identifier for this access record.' })
  id: string;

  @Field({ description: 'Unique identifier of the user.' })
  user_id: number;

  @Field({ description: 'Full name of the user.' })
  user_name: string;

  @Field({ description: 'Email address of the user.' })
  email_id: string;

  @Field({ description: 'Type of the user (e.g., Admin, Employee, Manager).' })
  user_type: string;

  @Field({
    description:
      'Status of the user, defined in UserStatus enum (e.g., Active, Inactive).',
  })
  status: UserStatus;

  @Field({
    description: 'Date when the user was added to the system or business.',
  })
  date_added: Date;

  @Field({
    nullable: true,
    description:
      'Permission to manage project trust payments. Possible values: Yes, No, View Only.',
  })
  manage_project_trust_payment: Permission;

  @Field({
    nullable: true,
    description:
      'Permission to manage users within the business. Possible values: Yes, No, View Only.',
  })
  manage_user: Permission;

  @Field({
    nullable: true,
    description:
      'Permission to manage business settings. Possible values: Yes, No, View Only.',
  })
  manage_company: Permission;

  @Field({
    nullable: true,
    description:
      'Permission to manage business subscriptions. Possible values: Yes, No, View Only.',
  })
  manage_subscription: Permission;
}
