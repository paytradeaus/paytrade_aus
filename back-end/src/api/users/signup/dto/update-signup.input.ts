import { InputType, Field } from '@nestjs/graphql';
import { MinLength } from 'class-validator';
import { SignatureType } from 'src/entities/subscription-details.entity';
import { Group } from 'src/entities/user-details.entity';
import { GraphQLJSONObject } from 'graphql-type-json';

@InputType({
  description:
    'Input payload used to update personal profile and contact details of an existing user.',
})
export class UpdateSignupInput {
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
    nullable: true,
    description: 'Current occupation of the user.',
  })
  occupation: string;

  @Field({
    description: 'Job title or position held by the user.',
  })
  position_title: string;

  @Field({
    description: 'Google Place ID representing the user location.',
  })
  place_id: string;

  @Field({
    description: 'Full residential or mailing address of the user.',
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
    description: 'Latitude coordinate of the user address.',
  })
  latitude: string;

  @Field({
    description: 'Longitude coordinate of the user address.',
  })
  longitude: string;

  @Field({
    description: 'Primary contact phone number (minimum 6 characters).',
  })
  @MinLength(6)
  user_phone_no: string;

  @Field({
    nullable: true,
    description: `User's digital signature.`,
  })
  signature: string;

  @Field({
    nullable: true,
    description: 'Type of signature provided (e.g., IMAGE, CANVAS).',
  })
  signature_type: SignatureType;

  @Field({
    nullable: true,
    description: 'User ID of the logged in user who updated the record.',
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
      'Group (User, Admin, System) under which the record was updated.',
  })
  updated_group: Group;

  @Field({
    nullable: true,
    description: 'Indicates whether the user signature was updated.',
  })
  is_signature_updated: boolean;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description:
      'Email notification preferences mapped by event type with boolean values.',
  })
  email_preferences: Record<string, boolean>;
}
