import { ObjectType, Field } from '@nestjs/graphql';
import { MappedStatuses } from 'src/libs/@paytrade-types/paytrade-types';

@ObjectType({ description: 'Represents a Xero project and its mapping status' })
export class GetXeroProjects {
  @Field({
    nullable: true,
    description: 'Internal ID of the Xero project record',
  })
  id: string;

  @Field({ nullable: true, description: 'Xero project ID' })
  project_id: string;

  @Field({
    nullable: true,
    description: 'Xero tenant ID associated with the project',
  })
  tenant_id: string;

  @Field({ nullable: true, description: 'Name of the Xero project' })
  project_name: string;

  @Field({ nullable: true, description: 'Status of the Xero project' })
  project_status: string;

  @Field({
    nullable: true,
    description: 'Mapping status between Xero and Paytrade',
  })
  mapped_status: MappedStatuses;

  @Field({
    nullable: true,
    description: 'Mapped Paytrade project ID if available',
  })
  pt_project_id: number;

  @Field({
    nullable: true,
    description: 'Mapped Paytrade project name if available',
  })
  pt_project_name: string;
}

@ObjectType({ description: 'List of Xero projects with pagination details' })
export class GetXeroProjectsList {
  @Field(() => [GetXeroProjects], {
    nullable: true,
    description: 'Array of Xero projects',
  })
  project_list: GetXeroProjects[];

  @Field({ description: 'Total number of Xero projects available' })
  total_count: Number;
}

@ObjectType({ description: 'Response wrapper for Xero project list API' })
export class GetXeroProjectsListResponse {
  @Field({ description: 'API response status' })
  status: string;

  @Field({ description: 'API response message' })
  message: string;

  @Field({ nullable: true, description: 'Data containing Xero projects list' })
  data?: GetXeroProjectsList;
}

@ObjectType({ description: 'Response wrapper for a single Xero project' })
export class GetXeroProjectsResponse {
  @Field({ description: 'API response status' })
  status: string;

  @Field({ description: 'API response message' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing a single Xero project',
  })
  data?: GetXeroProjects;
}

@ObjectType({
  description: 'Basic Paytrade project representation for listing',
})
export class GetPaytradeProjectsListRes {
  @Field({ nullable: true, description: 'Internal ID of the Paytrade project' })
  id: string;

  @Field({ nullable: true, description: 'Paytrade project ID' })
  project_id: string;

  @Field({ nullable: true, description: 'Name of the Paytrade project' })
  project_name: string;

  @Field({ nullable: true, description: 'Status of the Paytrade project' })
  project_status: string;
}

@ObjectType({
  description: 'Represents a Paytrade project and its mapping status',
})
export class GetPaytradeProjects {
  @Field({
    nullable: true,
    description: 'Internal ID of the Paytrade project record',
  })
  id: string;

  @Field({ nullable: true, description: 'Paytrade project ID' })
  project_id: number;

  @Field({ nullable: true, description: 'Name of the Paytrade project' })
  project_name: string;

  @Field({ nullable: true, description: 'Status of the Paytrade project' })
  project_status: string;

  @Field({
    nullable: true,
    description: 'Mapping status between Paytrade and Xero',
  })
  mapped_status: MappedStatuses;

  @Field({ nullable: true, description: 'Mapped Xero project ID if available' })
  xero_project_id: string;
}

@ObjectType({
  description: 'List of Paytrade projects with pagination details',
})
export class GetPaytradeProjectsList {
  @Field(() => [GetPaytradeProjects], {
    nullable: true,
    description: 'Array of Paytrade projects',
  })
  project_list: GetPaytradeProjects[];

  @Field({ description: 'Total number of Paytrade projects available' })
  total_count: Number;
}

@ObjectType({ description: 'Response wrapper for Paytrade project list API' })
export class GetPaytradeProjectsListResponse {
  @Field({ description: 'API response status' })
  status: string;

  @Field({ description: 'API response message' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing Paytrade projects list',
  })
  data: GetPaytradeProjectsList;
}

@ObjectType({ description: 'Response wrapper for a single Paytrade project' })
export class GetPaytradeProjectsResponse {
  @Field({ description: 'API response status' })
  status: string;

  @Field({ description: 'API response message' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing a single Paytrade project',
  })
  data?: GetPaytradeProjects;
}
