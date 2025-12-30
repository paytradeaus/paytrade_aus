import { ObjectType, Field } from '@nestjs/graphql';
import { SubsciptionPlanStatus } from 'src/entities/subscription-details.entity';

@ObjectType({ description: 'Details of a user in the system' })
export class PTUser {
  @Field({ nullable: true, description: 'Internal database ID' })
  id: string;

  @Field({ nullable: true, description: 'Unique user ID' })
  user_id: number;

  @Field({ nullable: true, description: 'First name of the user' })
  first_name: string;

  @Field({ nullable: true, description: 'Last name of the user' })
  last_name: string;

  @Field({ nullable: true, description: 'Email address of the user' })
  email_id: string;

  @Field({ nullable: true, description: 'Occupation of the user' })
  occupation: string;

  @Field({ nullable: true, description: 'Position title of the user' })
  position_title?: string;

  @Field({ nullable: true, description: "Name of the user's company" })
  company_name: string;

  @Field({ nullable: true, description: 'Status of the user account' })
  user_status: string;

  @Field({ nullable: true, description: 'Role of the user' })
  user_role: string;

  @Field({ nullable: true, description: 'Address of the user' })
  user_address: string;

  @Field({ nullable: true, description: 'Place ID for geolocation purposes' })
  place_id?: string;

  @Field({ nullable: true, description: 'Region or state of the user address' })
  region?: string;

  @Field({ nullable: true, description: 'Country of the user' })
  country?: string;

  @Field({
    nullable: true,
    description: 'Latitude coordinate of the user address',
  })
  latitude?: string;

  @Field({
    nullable: true,
    description: 'Longitude coordinate of the user address',
  })
  longitude?: string;

  @Field({ nullable: true, description: 'Phone number of the user' })
  user_phone_no: string;

  @Field({
    nullable: true,
    description: 'Indicates if admin has contacted the user',
  })
  is_admin_contacted: boolean;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the user was created',
  })
  created_on: Date;

  @Field({ nullable: true, description: 'Subscription ID of the user if any' })
  subscription_id: number;

  @Field({ nullable: true, description: 'Plan ID of the user subscription' })
  plan_id: number;

  @Field({ nullable: true, description: 'Status of the subscription plan' })
  subscription_status: SubsciptionPlanStatus;

  @Field({ nullable: true, description: 'Expiry date of the subscription' })
  expiry_date: Date;

  @Field({ nullable: true, description: 'Name of the subscription plan' })
  plan_name: string;

  @Field({ nullable: true, description: 'Company ID of the user' })
  user_company_id: number;

  @Field({ nullable: true, description: 'Company name of the user' })
  user_company_name: string;

  @Field({
    nullable: true,
    description: 'Indicates if the user is eligible for a free plan',
  })
  is_free_plan_eligible?: boolean;

  @Field({ nullable: true, description: 'Reason for free plan eligibility' })
  free_plan_reason?: string;
}

@ObjectType({ description: "Response containing a single user's details" })
export class PTUserResponse {
  @Field({ description: 'Status of the API response' })
  status: string;

  @Field({
    description: 'Message providing additional information about the response',
  })
  message: string;

  @Field({ nullable: true, description: 'User data object' })
  data?: PTUser;
}
