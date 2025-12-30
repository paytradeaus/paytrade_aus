import { ObjectType, Field } from '@nestjs/graphql';
import { SignatureType } from 'src/entities/subscription-details.entity';
import { GraphQLJSONObject } from 'graphql-type-json';

@ObjectType({ description: 'Represents a user registration (signup) record.' })
export class SignupRes {
  @Field({ description: 'Unique identifier for the signup record.' })
  id: string;

  @Field({ description: 'Unique identifier of the user.' })
  user_id: number;

  @Field({ description: 'First name of the user.' })
  first_name: string;

  @Field({ nullable: true, description: 'Last name of the user.' })
  last_name: string;

  @Field({ nullable: true, description: 'Date of birth of the user.' })
  date_of_birth: Date;

  @Field({ description: 'Email address of the user.' })
  email_id: string;

  @Field({ nullable: true, description: 'Occupation of the user.' })
  occupation: string;

  @Field({ description: 'Position title of the user in their organization.' })
  position_title: string;

  @Field({
    nullable: true,
    description: 'Name of the business the user is associated with, if any.',
  })
  company_name: string;

  @Field({
    description: `Place ID representing the user's location (e.g., Google Place ID).`,
  })
  place_id: string;

  @Field({ description: 'Full address of the user.' })
  user_address: string;

  @Field({ description: `Country of the user's address` })
  country: string;

  @Field({
    description: 'State or region of the user address.',
  })
  region: string;

  @Field({ description: `Latitude coordinate of the user's location.` })
  latitude: string;

  @Field({ description: `Longitude coordinate of the user's location.` })
  longitude: string;

  @Field({ description: 'Phone number of the user.' })
  user_phone_no: string;

  @Field({
    nullable: true,
    description: 'Status of the user account (e.g., Active, Inactive).',
  })
  user_status: string;

  @Field({ nullable: true, description: 'Role assigned to the user.' })
  user_role: string;

  @Field({
    nullable: true,
    description: 'Indicates whether the user account has been verified.',
  })
  is_verified: boolean;

  @Field({ nullable: true, description: `Timestamp of the user's last login.` })
  last_logged_in: Date;

  @Field({
    nullable: true,
    description: 'File associated with the user (e.g., profile image).',
  })
  file: string;

  @Field({
    nullable: true,
    description: `User's signature in base64 or file path format.`,
  })
  signature?: string;

  @Field({
    nullable: true,
    description: 'Type of signature (e.g., digital, handwritten).',
  })
  signature_type?: SignatureType;

  @Field({
    nullable: true,
    description: 'Indicates whether the user has a linked bank account.',
  })
  has_bank_account: boolean;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description:
      'User email preferences stored as a JSON object where each key is the type of email and the value is a boolean indicating opt-in status.',
  })
  email_preferences: Record<string, boolean>;
}

@ObjectType({
  description: 'Standard response wrapper for a list of user signup records.',
})
export class SignupResponse {
  @Field({ description: 'Status of the response (e.g., SUCCESS, ERROR).' })
  status: string;

  @Field({ description: 'Message describing the result of the operation.' })
  message: string;

  @Field(() => [SignupRes], {
    nullable: true,
    description: 'List of user signup records.',
  })
  data?: SignupRes[];
}
