import { InputType, Field } from '@nestjs/graphql';
import { MinLength } from 'class-validator';
import { Group } from 'src/entities/user-details.entity';
export type UserStatus =
  | 'Active'
  | 'Inactive'
  | 'Pending'
  | 'Blocked'
  | 'Archived'
  | 'Deleted';

@InputType({
  description:
    'Input payload used to register a new user account with personal and location details.',
})
export class CreateSignupInput {
  @Field({
    description: 'First name of the user.',
  })
  first_name: string;

  @Field({
    nullable: true,
    description: 'Last name of the user.',
  })
  last_name: string;

  @Field({
    nullable: true,
    description: 'Date of birth of the user.',
  })
  date_of_birth: Date;

  @Field({
    description: 'Email address used for login and verification.',
  })
  email_id: string;

  @Field({
    nullable: true,
    description: 'Occupation or profession of the user.',
  })
  occupation: string;

  @Field({
    description: 'Job title or position of the user.',
  })
  position_title: string;

  @Field({
    nullable: true,
    description: 'Company name associated with the user.',
  })
  company_name: string;

  @Field({
    description: 'Google Place ID representing the user location.',
  })
  place_id: string;

  @Field({
    description: 'Full address of the user.',
  })
  user_address: string;

  @Field({
    description: 'Country of residence.',
  })
  country: string;

  @Field({
    description: 'State or region of the user address.',
  })
  region: string;

  @Field({
    description: 'Latitude coordinate of the user location.',
  })
  latitude: string;

  @Field({
    description: 'Longitude coordinate of the user location.',
  })
  longitude: string;

  @Field({
    description: 'User phone number with minimum 6 characters.',
  })
  @MinLength(6)
  user_phone_no: string;

  @Field({
    description: 'Current status of the user account.',
  })
  user_status: UserStatus;

  @Field({
    description: 'Indicates whether the user email is verified.',
  })
  is_verified: Boolean;

  @Field({
    description: 'Password for user authentication.',
  })
  password: string;

  @Field({
    description: 'Verification code sent to the user email.',
  })
  verification_code: string;

  @Field({
    description: 'Type of verification email being processed.',
  })
  mail_type: string;

  @Field({
    nullable: true,
    description: 'Timezone of the user.',
  })
  user_timezone: string;

  @Field({
    nullable: true,
    description: 'User ID of the logged-in user who created the record.',
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
      'Group (User, Admin, System) under which the record is created.',
  })
  created_group: Group;
}
