import { InputType, Field } from '@nestjs/graphql';
import { MinLength } from 'class-validator';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { Group, UserStatus } from 'src/entities/user-details.entity';

@InputType({ description: 'Input type for admin to create a new user' })
export class AdminCreateUserInput {
  @Field({ description: 'First name of the user' })
  first_name: string;

  @Field({ nullable: true, description: 'Last name of the user' })
  last_name?: string;

  @Field({ description: 'Email ID of the user' })
  email_id: string;

  @Field({ nullable: true, description: 'Occupation of the user' })
  occupation?: string;

  @Field({ description: 'Position title of the user within the company' })
  position_title: string;

  @Field({ description: 'Company name the user belongs to' })
  company_name: string;

  @Field({ description: 'Place ID for the user address' })
  place_id: string;

  @Field({ description: 'User street address' })
  user_address: string;

  @Field({ description: 'Country of the user address' })
  country: string;

  @Field({ description: 'State or region of the user address' })
  region: string;

  @Field({ description: 'Latitude coordinate of the user address' })
  latitude: string;

  @Field({ description: 'Longitude coordinate of the user address' })
  longitude: string;

  @Field({ description: 'User phone number, minimum length of 6' })
  @MinLength(6)
  user_phone_no: string;

  @Field({ description: 'Status of the user account' })
  user_status: UserStatus;

  @Field({ nullable: true, description: 'Role assigned to the user' })
  user_role?: Role;

  @Field({ nullable: true, description: 'Timezone of the user' })
  user_timezone?: string;

  @Field({ description: 'User ID of the admin creating this record' })
  created_by: number;

  @Field({ description: 'Timestamp when the record was created' })
  created_on: Date;

  @Field({
    nullable: true,
    description:
      'Group (User, Admin, System) under which the record is created',
  })
  created_group?: Group;
}
