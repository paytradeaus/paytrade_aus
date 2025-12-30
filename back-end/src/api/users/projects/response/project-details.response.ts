import { ObjectType, Field, Int } from '@nestjs/graphql';
import { ProjectStatus } from 'src/entities/project-details.entity';

@ObjectType({ description: 'Details of an individual project.' })
export class ProjectDetailsRes {
  @Field({ description: 'Unique identifier of the project record.' })
  id: string;

  @Field({
    description: 'Identifier of the business associated with this project.',
  })
  company_id: number;

  @Field({ description: 'Numeric project ID.' })
  project_id: number;

  @Field({ description: 'Name of the project.' })
  project_name: string;

  @Field({
    description:
      'Status of the project (e.g., Draft, In Progress, Completed, Deleted).',
  })
  project_status: ProjectStatus;
}

@ObjectType({
  description: 'Response object containing the details of a single project.',
})
export class ProjectDetailsResponse {
  @Field({ description: 'Status of the API call (e.g., SUCCESS, ERROR).' })
  status: string;

  @Field({ description: 'Message describing the result of the API call.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Project details if the API call was successful.',
  })
  data?: ProjectDetailsRes;
}

@ObjectType({
  description:
    'Response object for checking the existence of one or more projects.',
})
export class CheckExistenceForProjectResponse {
  @Field({ description: 'Status of the API call (e.g., SUCCESS, ERROR).' })
  status: string;

  @Field({ description: 'Message describing the result of the API call.' })
  message: string;

  @Field(() => [ProjectDetailsRes], {
    nullable: true,
    description: 'List of projects that match the existence check criteria.',
  })
  data?: ProjectDetailsRes[];
}
