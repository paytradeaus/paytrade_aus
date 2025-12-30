import { ObjectType, Field } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import { UserMode } from 'src/libs/@paytrade-types/paytrade-types';

@ObjectType({ description: 'List of activity logs along with total count.' })
export class ActivityLogListRes {
  @Field(() => [ActivityLogRes], {
    nullable: true,
    description: 'Array of activity logs.',
  })
  activity_logs: ActivityLogRes[];

  @Field({ description: 'Total number of activity logs available.' })
  total_count: number;
}

@ObjectType({ description: 'Response object for fetching activity logs.' })
export class ActivityLogListResponse {
  @Field({ description: 'Status of the API response.' })
  status: string;

  @Field({ description: 'Message describing the API response.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing the activity log list and total count.',
  })
  data?: ActivityLogListRes;
}

@ObjectType({ description: 'Represents an individual activity log entry.' })
export class ActivityLogRes {
  @Field({
    nullable: true,
    description: 'User ID of the sender of the activity.',
  })
  from_user: number;

  @Field({
    nullable: true,
    description: 'First name of the user who triggered the activity.',
  })
  first_name: string;

  @Field({
    nullable: true,
    description: 'Last name of the user who triggered the activity.',
  })
  last_name: string;

  @Field({
    nullable: true,
    description: 'Email of the user who triggered the activity.',
  })
  email_id: string;

  @Field({
    nullable: true,
    description: 'User ID of the recipient of the activity (if any).',
  })
  to_user: number;

  @Field({
    nullable: true,
    description: 'Mode of the user (e.g., admin, user).',
  })
  user_mode: UserMode;

  @Field({
    nullable: true,
    description: 'ID of the business associated with the activity.',
  })
  company_id: number;

  @Field({
    nullable: true,
    description: 'Name of the business associated with the activity.',
  })
  company_name: string;

  @Field({
    nullable: true,
    description: 'Email ID of the business associated with the activity.',
  })
  company_email_id: string;

  @Field({
    description: 'ID of the event template associated with this activity.',
  })
  event_template_id: number;

  @Field({ description: 'Group/category of the event.' })
  event_group: string;

  @Field({ description: 'Type of the event.' })
  event_type: string;

  @Field({ description: 'Descriptive text of the event.' })
  event_text: string;

  @Field({ description: 'Date of the event.' })
  event_date: Date;

  @Field({ description: 'Timestamp indicating when the record was created.' })
  created_on: Date;

  @Field({
    nullable: true,
    description: 'Indicates if the activity was performed by an admin.',
  })
  is_admin: Boolean;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Dynamic JSON values associated with the activity.',
  })
  dynamic_values: Record<string, any>;

  @Field({
    nullable: true,
    description: 'Admin ID if the activity was performed by an admin.',
  })
  admin_id: number;

  @Field({
    nullable: true,
    description: 'Timezone of the user who triggered the activity.',
  })
  timezone: string;

  // @Field({ nullable: true })
  // admin_email_id: string;
}
