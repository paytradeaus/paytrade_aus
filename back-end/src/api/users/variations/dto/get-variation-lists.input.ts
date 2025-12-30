import { InputType, Field } from '@nestjs/graphql';
import { VariationStatus } from 'src/entities/variation-details.entity';

@InputType({
  description:
    'Input type for fetching a paginated and filtered list of variations for a business.',
})
export class GetVariationListsInput {
  @Field({
    description: 'ID of the business for which variations are being fetched.',
  })
  company_id: number;

  @Field({
    nullable: true,
    defaultValue: null,
    description:
      'Page number for pagination. Defaults to null if not provided.',
  })
  page_number?: number;

  @Field({
    nullable: true,
    defaultValue: null,
    description:
      'Number of records per page for pagination. Defaults to null if not provided.',
  })
  page_size?: number;

  @Field({
    nullable: true,
    description:
      'Filter variations by their status (e.g., Draft, Agreed, In Review, Refused, Archived, Deleted).',
  })
  variation_status?: VariationStatus;

  @Field({ nullable: true, description: 'Filter variations by project ID.' })
  project_id?: number;

  @Field({ nullable: true, description: 'Filter variations by contract ID.' })
  contract_id?: number;

  @Field({
    nullable: true,
    description:
      'Search keyword to filter variations by name or other relevant fields.',
  })
  search?: string;

  @Field({
    nullable: true,
    description: 'Predefined date filter (e.g., "This month", "Last month").',
  })
  date_filter?: string;

  @Field({
    nullable: true,
    description: 'Start date for custom date filtering.',
  })
  start_date?: Date;

  @Field({ nullable: true, description: 'End date for custom date filtering.' })
  end_date?: Date;

  @Field({
    nullable: true,
    description: 'Field name by which the results should be sorted.',
  })
  sorting_field: string;

  @Field({
    nullable: true,
    description: 'Sorting order: ASC for ascending, DESC for descending.',
  })
  sorting_order: 'ASC' | 'DESC';
}

@InputType({
  description:
    'Input type for fetching a paginated list of variations specific to a project within a business.',
})
export class GetVariationListForProjectsInput {
  @Field({ description: 'ID of the business.' })
  company_id: number;

  @Field({ description: 'Page number for pagination.' })
  page_number: number;

  @Field({ description: 'Number of records per page for pagination.' })
  page_size: number;

  @Field({
    description: 'ID of the project for which variations are being fetched.',
  })
  project_id: number;

  @Field({
    nullable: true,
    description: 'Optional search keyword to filter variations.',
  })
  search?: string;

  @Field({
    nullable: true,
    description: 'Predefined date filter (e.g., "This month", "Last month").',
  })
  date_filter?: string;

  @Field({
    nullable: true,
    description: 'Start date for custom date filtering.',
  })
  start_date?: Date;

  @Field({ nullable: true, description: 'End date for custom date filtering.' })
  end_date?: Date;

  @Field({
    nullable: true,
    description: 'Field name by which the results should be sorted.',
  })
  sorting_field: string;

  @Field({
    nullable: true,
    description: 'Sorting order: ASC for ascending, DESC for descending.',
  })
  sorting_order: 'ASC' | 'DESC';
}
