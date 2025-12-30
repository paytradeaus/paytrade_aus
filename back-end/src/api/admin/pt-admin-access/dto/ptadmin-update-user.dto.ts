import { InputType, Field, registerEnumType } from '@nestjs/graphql';
import { Role } from '../../../../api/auth/role-guard/role.enum';
import { UserStatus } from '../../../../entities/user-details.entity';

@InputType({ description: 'Input type for updating user details' })
export class UpdateUserDetailsInput {
  @Field({ description: 'Unique ID of the user to update', nullable: true })
  user_id?: number;

  @Field({ description: 'First name of the user', nullable: true })
  first_name?: string;

  @Field({ description: 'Last name of the user', nullable: true })
  last_name?: string;

  @Field({ description: 'Email ID of the user', nullable: true })
  email_id?: string;

  @Field({ description: 'Occupation of the user', nullable: true })
  occupation?: string;

  @Field({ description: 'Position title of the user', nullable: true })
  position_title?: string;

  @Field({
    description: 'Name of the company the user belongs to',
    nullable: true,
  })
  company_name?: string;

  @Field({ description: 'User address', nullable: true })
  user_address?: string;

  @Field({
    description: 'Place ID associated with the user address',
    nullable: true,
  })
  place_id?: string;

  @Field({ description: 'Region or state of the user', nullable: true })
  region?: string;

  @Field({ description: 'Country of the user', nullable: true })
  country?: string;

  @Field({ description: 'Latitude of user location', nullable: true })
  latitude?: string;

  @Field({ description: 'Longitude of user location', nullable: true })
  longitude?: string;

  @Field({ description: 'Phone number of the user', nullable: true })
  user_phone_no?: string;

  @Field({
    description: 'Indicates if the admin has contacted the user',
    nullable: true,
  })
  is_admin_contacted?: boolean;

  @Field({ description: 'Status of the user', nullable: true })
  user_status?: UserStatus;

  @Field({ description: 'Role of the user', nullable: true })
  user_role?: Role;

  // Add other optional fields as needed
}
