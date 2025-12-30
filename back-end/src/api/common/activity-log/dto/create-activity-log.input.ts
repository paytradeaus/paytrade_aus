import { InputType, Int, Field } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import { Group } from 'src/entities/user-details.entity';

@InputType({
  description: 'Input data required to create an activity log entry.',
})
export class CreateActivityLogInput {
  @Field({
    nullable: true,
    description: 'Optional event template ID associated with the activity log.',
  })
  event_template_id?: number;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description:
      'Dynamic key-value pairs for storing custom values related to the activity log.',
  })
  dynamic_values?: Record<string, any>;

  @Field({
    nullable: true,
    description:
      'Date when the event occurred. If not provided, current date may be used.',
  })
  event_date?: Date;

  @Field({
    nullable: true,
    description: 'User ID of the person performing the action.',
  })
  from_user?: number;

  @Field({
    nullable: true,
    description:
      'User ID of the person receiving the action/event, if applicable.',
  })
  to_user?: number;

  @Field({
    nullable: true,
    description: 'Admin ID, if the action was performed by an admin.',
  })
  admin_id?: number;

  @Field({
    nullable: true,
    description: 'Business ID associated with this activity log.',
  })
  company_id?: number;

  @Field({
    nullable: true,
    description: 'Indicates whether this activity log was created by an admin.',
  })
  is_admin: Boolean;

  @Field({
    nullable: true,
    description: 'ID of the user who created this activity log entry.',
  })
  created_by?: number;

  @Field({
    nullable: true,
    description: 'Group associated with this activity log, if applicable.',
  })
  created_group?: Group;
}
