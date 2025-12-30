import { InputType, Field } from '@nestjs/graphql';
import {
  ProjectRole,
  ProjectStatus,
} from 'src/entities/project-details.entity';

@InputType({
  description:
    'Input type for fetching a paginated list of projects for a business with optional filtering and sorting.',
})
export class GetProjectListsInput {
  @Field({
    description: 'ID of the business whose projects are being fetched.',
  })
  company_id: number;

  @Field({
    nullable: true,
    defaultValue: null,
    description:
      'Page number for pagination. Defaults to first page if not provided.',
  })
  page_number?: number;

  @Field({
    nullable: true,
    defaultValue: null,
    description:
      'Number of projects per page. Defaults to all if not provided.',
  })
  page_size?: number;

  @Field({
    nullable: true,
    description:
      'Filter projects by status (e.g., Active, Completed, Archived).',
  })
  project_status?: ProjectStatus;

  @Field({
    nullable: true,
    description:
      'Filter projects by role (e.g., Principal, Head Contractor, Sub Contractor).',
  })
  project_role?: ProjectRole;

  @Field({
    nullable: true,
    description: 'Search term to filter projects by name or project ID.',
  })
  project_name_or_id?: string;

  @Field({
    nullable: true,
    description:
      'Type of date filter to apply (e.g., "This month", "Last month").',
  })
  date_filter?: string;

  @Field({ nullable: true, description: 'Start date for filtering projects.' })
  start_date?: Date;

  @Field({ nullable: true, description: 'End date for filtering projects.' })
  end_date?: Date;

  @Field({
    nullable: true,
    description:
      'Field name to sort the results by (e.g., project_name, project_date).',
  })
  sorting_field?: string;

  @Field({
    nullable: true,
    description: 'Sorting order: ASC for ascending, DESC for descending.',
  })
  sorting_order?: 'ASC' | 'DESC';
}

@InputType({
  description:
    'Input type for fetching contracts associated with a specific project or business.',
})
export class GetProjectContractListsInput {
  @Field({
    description:
      'ID of the business whose project contracts are being fetched.',
  })
  company_id: number;

  @Field({
    nullable: true,
    description:
      'ID of the project to filter contracts. If omitted, contracts for all projects in the business are returned.',
  })
  project_id: number;

  @Field({
    nullable: true,
    description: 'ID of a specific contract to filter results.',
  })
  contract_id: number;

  @Field({
    nullable: true,
    description: 'Flag to include archived contracts in the results.',
  })
  is_archived: boolean;
}
