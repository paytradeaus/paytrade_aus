import { ObjectType, Field } from '@nestjs/graphql';
import {
  Eligibility,
  ProjectRole,
  ProjectStatus,
} from 'src/entities/project-details.entity';

@ObjectType({ description: 'Response object for fetching a list of projects.' })
export class GetProjectsListResponse {
  @Field({ description: 'Status of the API call (e.g., SUCCESS, ERROR).' })
  status: string;

  @Field({ description: 'Message describing the result of the API call.' })
  message: string;

  @Field(() => [GetProjectsList], {
    nullable: true,
    description: 'List of projects returned from the API.',
  })
  data?: GetProjectsList[];
}

@ObjectType({
  description: 'Details of an individual project in the projects list.',
})
export class GetProjectsList {
  @Field({
    nullable: true,
    description: 'Unique identifier of the project record.',
  })
  id: string;

  @Field({ nullable: true, description: 'Numeric project ID.' })
  project_id: number;

  @Field({ nullable: true, description: 'Name of the project.' })
  project_name: string;

  @Field({
    nullable: true,
    description:
      'Role of the project (e.g., Principal, Head Contractor, Sub Contractor).',
  })
  project_role: ProjectRole;

  @Field({
    nullable: true,
    description:
      'Status of the project (e.g., Draft, In Progress, Completed, Deleted).',
  })
  project_status: ProjectStatus;

  @Field({
    nullable: true,
    description: 'Eligibility for PTA (e.g., Yes, No).',
  })
  pta_eligibility: Eligibility;

  @Field({
    nullable: true,
    description: 'Eligibility for RTA (e.g., Yes, No).',
  })
  rta_eligibility: Eligibility;
}

@ObjectType({ description: 'Generic dropdown option with value-label pair.' })
export class GetDropdownList {
  @Field({
    nullable: true,
    description: 'Unique identifier for the dropdown option.',
  })
  id: string;

  @Field({
    nullable: true,
    description: 'Value corresponding to the dropdown option, usually numeric.',
  })
  value: number;

  @Field({ nullable: true, description: 'Label displayed in the dropdown.' })
  label: string;
}

@ObjectType({
  description: 'Lists of projects and contracts for dropdown selection.',
})
export class GetProjectsContracts {
  @Field(() => [GetDropdownList], {
    nullable: true,
    description: 'List of projects formatted for dropdown display.',
  })
  project_list?: GetDropdownList[];

  @Field(() => [GetDropdownList], {
    nullable: true,
    description: 'List of contracts formatted for dropdown display.',
  })
  contract_list?: GetDropdownList[];
}

@ObjectType({
  description:
    'Response object for fetching projects and contracts dropdown lists.',
})
export class GetProjectsContractsListResponse {
  @Field({ description: 'Status of the API call (e.g., SUCCESS, ERROR).' })
  status: string;

  @Field({ description: 'Message describing the result of the API call.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Dropdown data containing project and contract lists.',
  })
  data?: GetProjectsContracts;
}
