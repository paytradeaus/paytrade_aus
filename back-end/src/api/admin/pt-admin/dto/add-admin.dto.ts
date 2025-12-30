import { InputType, Field } from '@nestjs/graphql';
import { AdminStatus } from '../../../../entities/admin-details.entity';

@InputType({ description: 'Input data required to add a new PT Admin user' })
export class AddPTAdminInput {
  @Field({ description: 'First name of the admin' })
  first_name: string;

  @Field({ nullable: true, description: 'Last name of the admin' })
  last_name?: string;

  @Field({ description: 'Email address of the admin' })
  email_id: string;

  @Field({ description: 'Password for the admin account' })
  password: string;

  @Field({
    description: 'Status of the admin account (e.g., ACTIVE, INACTIVE)',
  })
  admin_status: AdminStatus;

  @Field({
    nullable: true,
    description: 'User ID of the logged in user who is creating this admin',
  })
  created_by?: number;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the admin record was created',
  })
  created_on?: Date;

  @Field(() => [String], {
    nullable: true,
    description: 'IDs of the groups assigned to this admin',
  })
  group_ids?: string[];
}

export enum SortingOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}
