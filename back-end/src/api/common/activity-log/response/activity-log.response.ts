import { ObjectType, Field, Int } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';

@ObjectType({
  description: 'Represents the details of a single activity log entry.',
})
export class LogResponse {
  @Field({
    description: 'ID of the event template associated with the activity.',
  })
  event_template_id: number;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Dynamic JSON values associated with the activity.',
  })
  dynamic_values: Record<string, any>;

  @Field({ nullable: true, description: 'Date of the activity event.' })
  event_date: Date;

  @Field({
    nullable: true,
    description: 'User ID of the sender who triggered the activity.',
  })
  from_user: number;

  @Field({
    nullable: true,
    description: 'User ID of the recipient of the activity, if applicable.',
  })
  to_user: number;

  @Field({
    nullable: true,
    description: 'ID of the business associated with the activity.',
  })
  company_id: number;

  @Field({
    nullable: true,
    description: 'Indicates whether the activity was performed by an admin.',
  })
  is_admin: Boolean;

  @Field({
    nullable: true,
    description: 'ID of the admin who performed the activity, if applicable.',
  })
  admin_id: string;
}

@ObjectType({
  description: 'Standard response wrapper for activity log operations.',
})
export class ActivityLogResponse {
  @Field({
    description: 'Status of the API response, e.g., SUCCESS or FAILED.',
  })
  status: string;

  @Field({
    description: 'Message providing additional context about the API response.',
  })
  message: string;

  @Field({
    nullable: true,
    description:
      'The data payload containing details of the activity log, if available.',
  })
  data?: LogResponse;
}
