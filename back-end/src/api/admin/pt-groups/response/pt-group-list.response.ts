import { ObjectType, Field, Int } from '@nestjs/graphql';
import { PTGroup } from './pt-group.response';

@ObjectType({ description: 'List of groups with their details.' })
export class PTGroupList {
  @Field(() => [PTGroup], { description: 'Array of group objects.' })
  groups: PTGroup[];

  @Field(() => Int, { description: 'Total number of groups.' })
  totalCount: number;
}

@ObjectType({ description: 'Response for fetching a list of groups.' })
export class PTGroupListResponse {
  @Field({ description: 'Status of the response.' })
  status: string;

  @Field({
    description: 'Message providing additional information about the response.',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing the list of groups and total count.',
  })
  data?: PTGroupList;
}
