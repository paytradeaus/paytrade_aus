import { InputType, Field } from '@nestjs/graphql';
import { Role } from '../../../auth/role-guard/role.enum';
import { Group } from 'src/entities/user-details.entity';
export type Status = 'Active' | 'Inactive' | 'Blocked' | 'Archived' | 'Deleted';
export type Permission = 'Yes' | 'No' | 'View Only';

@InputType({
  description:
    'Input type to create or assign access permissions for a user within a business.',
})
export class CreateUserAccessInput {
  @Field({
    nullable: true,
    description:
      'Unique identifier of the user. Optional when creating new user access.',
  })
  user_id: number;

  @Field({
    nullable: true,
    description:
      'Unique identifier of the business. Optional when assigning access without business context.',
  })
  company_id: number;

  @Field({
    nullable: true,
    description:
      'First name of the user. Used for display or assignment purposes.',
  })
  user_first_name: string;

  @Field({
    nullable: true,
    description: 'Full name of the user. Optional field for display purposes.',
  })
  user_name: string;

  @Field({
    nullable: true,
    description: 'Email address of the user to identify or invite them.',
  })
  email_id: string;

  @Field({
    nullable: true,
    description: 'Role of the user in the business, e.g., Admin, Basic User.',
  })
  company_role: Role;

  @Field({
    nullable: true,
    description:
      'Permission to manage project trust payments. Values: Yes, No, View Only.',
  })
  manage_project_trust_payment: Permission;

  @Field({
    nullable: true,
    description: 'Permission to manage users. Values: Yes, No, View Only.',
  })
  manage_user: Permission;

  @Field({
    nullable: true,
    description:
      'Permission to manage business details. Values: Yes, No, View Only.',
  })
  manage_company: Permission;

  @Field({
    nullable: true,
    description:
      'Permission to manage subscriptions. Values: Yes, No, View Only.',
  })
  manage_subscription: Permission;

  @Field({
    description: 'Indicates whether the user already exists in the system.',
  })
  is_user_exists: boolean;

  @Field({
    nullable: true,
    description:
      'User ID of the currently logged in user performing this action.',
  })
  created_by: number;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the access record was created.',
  })
  created_on: Date;

  @Field({
    nullable: true,
    description:
      'Group context under which the access record was created (User, Admin, System).',
  })
  created_group: Group;
}

@InputType({
  description:
    'Input type used when a user joins a business and access permissions are assigned.',
})
export class CreateJoinUserAccessInput {
  @Field({ description: 'Unique identifier of the user joining the business.' })
  user_id: number;

  @Field({
    description: 'Unique identifier of the business the user is joining.',
  })
  company_id: number;

  @Field({
    nullable: true,
    description: 'First name of the user. Optional for display purposes.',
  })
  user_first_name: string;

  @Field({
    nullable: true,
    description: 'Full name of the user. Optional for display purposes.',
  })
  user_name: string;

  @Field({ description: 'Email address of the user joining the business.' })
  email_id: string;

  @Field({
    nullable: true,
    description:
      'Role of the user in the business. Optional if default role is assigned.',
  })
  company_role: Role;

  @Field({
    nullable: true,
    description:
      'Permission to manage project trust payments. Values: Yes, No, View Only.',
  })
  manage_project_trust_payment: Permission;

  @Field({
    nullable: true,
    description: 'Permission to manage users. Values: Yes, No, View Only.',
  })
  manage_user: Permission;

  @Field({
    nullable: true,
    description:
      'Permission to manage business details. Values: Yes, No, View Only.',
  })
  manage_company: Permission;

  @Field({
    nullable: true,
    description:
      'Permission to manage subscriptions. Values: Yes, No, View Only.',
  })
  manage_subscription: Permission;

  @Field({
    description: 'Indicates whether the user already exists in the system.',
  })
  is_user_exists: boolean;

  @Field({
    nullable: true,
    description:
      'User ID of the currently logged in user performing this action.',
  })
  created_by: number;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the access record was created.',
  })
  created_on: Date;

  @Field({
    nullable: true,
    description:
      'Group context under which the access record was created (User, Admin, System).',
  })
  created_group: Group;
}
