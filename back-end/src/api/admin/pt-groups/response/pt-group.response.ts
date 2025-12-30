import { ObjectType, Field, Int } from '@nestjs/graphql';
import { GroupStatus } from '../../../../entities/admin-group-details.entity';

@ObjectType({ description: 'Represents a group with its details.' })
export class PTGroup {
  @Field({ description: 'Unique identifier of the group.' })
  id: string;

  @Field({ description: 'Name of the group.' })
  group_name: string;

  @Field({ nullable: true, description: 'Optional description of the group.' })
  group_description: string;

  @Field({ description: 'Status of the group (e.g., Active, Inactive).' })
  group_status: GroupStatus;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the group record was created.',
  })
  created_on: Date;
}

@ObjectType({ description: 'Response object for a single group query.' })
export class PTGroupResponse {
  @Field({ description: 'Status of the response.' })
  status: string;

  @Field({
    description: 'Message providing additional information about the response.',
  })
  message: string;

  @Field({ nullable: true, description: 'Data containing the group details.' })
  data?: PTGroup;
}
