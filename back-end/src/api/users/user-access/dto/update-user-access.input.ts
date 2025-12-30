import { Group } from 'src/entities/user-details.entity';
import { Permission } from './create-user-access.input';
import { InputType, Field, Int } from '@nestjs/graphql';

@InputType({
  description: `Input type used to update a user's access permissions within a specific business.`,
})
export class UpdateUserAccessInput {
  @Field(() => Int, {
    description: 'Unique identifier of the user whose access is being updated.',
  })
  user_id: number;

  @Field(() => Int, {
    description: 'Unique identifier of the business where the user belongs.',
  })
  company_id: number;

  @Field({
    description:
      'Full name of the user. Used for display and logging purposes.',
  })
  user_name: string;

  @Field({
    description:
      'Role of the user within the business (e.g., Admin, Employee).',
  })
  company_role: string;

  @Field({
    description:
      'Current status of the user access. Should be one of the allowed Status values (Active, Inactive, Blocked, Archived, Deleted).',
  })
  status: string;

  @Field({
    nullable: true,
    description:
      'Permission to manage project trust payments. Valid values: Yes, No, View Only.',
  })
  manage_project_trust_payment: Permission;

  @Field({
    nullable: true,
    description:
      'Permission to manage other users in the business. Valid values: Yes, No, View Only.',
  })
  manage_user: Permission;

  @Field({
    nullable: true,
    description:
      'Permission to manage business details. Valid values: Yes, No, View Only.',
  })
  manage_company: Permission;

  @Field({
    nullable: true,
    description:
      'Permission to manage subscriptions. Valid values: Yes, No, View Only.',
  })
  manage_subscription: Permission;

  @Field({
    nullable: true,
    description:
      'User ID of the person performing the update. Used for audit tracking.',
  })
  updated_by: number;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the record was updated.',
  })
  updated_on: Date;

  @Field({
    nullable: true,
    description:
      'Group under which the update was performed (User, Admin, System). Used for audit tracking.',
  })
  updated_group: Group;
}
