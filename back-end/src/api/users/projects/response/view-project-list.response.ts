import { ObjectType, Field } from '@nestjs/graphql';
import { ViewProjectRes } from './view-project.response';

@ObjectType({
  description:
    'Response object containing a list of projects with detailed information.',
})
export class ViewProjectListRes {
  @Field(() => [ViewProjectRes], {
    nullable: true,
    description:
      'Array of projects. Each item provides detailed information about a single project.',
  })
  project_list: ViewProjectRes[];

  @Field({
    description:
      'Total number of projects matching the query or filter criteria.',
  })
  total_count: Number;
}

@ObjectType({
  description: 'Standard response wrapper for fetching multiple projects.',
})
export class ViewProjectListResponse {
  @Field({ description: 'Status of the API call (e.g., SUCCESS, ERROR).' })
  status: string;

  @Field({ description: 'Message describing the outcome of the API call.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data object containing the list of projects and total count.',
  })
  data?: ViewProjectListRes;
}
