import { InputType, Field } from '@nestjs/graphql';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { Status } from 'src/entities/company-user-roles.entity';
import { Group } from 'src/entities/user-details.entity';

@InputType({
  description:
    'Input used to assign a business-specific role to an existing user.',
})
export class CreateCompanySpecificRoles {
  @Field({
    description:
      'Unique identifier of the user to be linked with the business.',
  })
  user_id: number;

  @Field({
    description:
      'Unique identifier of the business to which the user is assigned.',
  })
  company_id: number;
}

@InputType({
  description:
    'Input used to create a system-assigned business role for a user.',
})
export class CreateSystemCompanySpecificRoles {
  @Field({
    description: 'Display name of the user receiving the business role.',
  })
  user_name: string;

  @Field({
    description: 'Unique identifier of the user receiving the role.',
  })
  user_id: number;

  @Field({
    description: 'Unique identifier of the business associated with the role.',
  })
  company_id: number;

  @Field({
    description: 'Role assigned to the user within the business context.',
  })
  company_role: Role;

  @Field({
    description: 'Date when the user joined the business.',
  })
  joined_on: Date;

  @Field({
    description: 'Current status of the user within the business.',
  })
  status: Status;

  @Field({
    description: 'Indicates whether the role was assigned by the system.',
  })
  is_system_added: Boolean;

  @Field({
    nullable: true,
    description: 'User ID of the logged in user who created the record.',
  })
  created_by: number;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the record was created.',
  })
  created_on: Date;

  @Field({
    nullable: true,
    description:
      'Group (User, Admin, System) under which the record was created.',
  })
  created_group: Group;
}
