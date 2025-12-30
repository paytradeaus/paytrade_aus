import { InputType, Field } from '@nestjs/graphql';
import { ClientSupplierType } from 'src/entities/client-suppliers-details.entity';
import { ContractStatus } from 'src/entities/contract-details.entity';

@InputType({
  description:
    'Input type for fetching a paginated list of contracts with optional filters.',
})
export class GetContractListsInput {
  @Field({
    description: 'ID of the business for which contracts are being fetched.',
  })
  company_id: number;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Page number for pagination (optional).',
  })
  page_number?: number;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Number of items per page for pagination (optional).',
  })
  page_size?: number;

  @Field({
    nullable: true,
    description:
      'Filter contracts by their status (optional) (e.g., Draft, In Progress, Completed, Archived, Deleted).',
  })
  contract_status?: ContractStatus;

  @Field({
    nullable: true,
    description: 'Filter contracts by project ID (optional).',
  })
  project_id?: number;

  @Field({
    nullable: true,
    description:
      'Filter contracts by client or supplier type (optional) (e.g., Client, Supplier).',
  })
  client_supplier_type?: ClientSupplierType;

  @Field({
    nullable: true,
    description:
      'Search keyword to filter contracts by name or other fields (optional).',
  })
  search?: string;

  @Field({
    nullable: true,
    description:
      'Type of date filter to apply (e.g., "This month", "Last month") (optional).',
  })
  date_filter?: string;

  @Field({
    nullable: true,
    description: 'Start date for the date filter (optional).',
  })
  start_date?: Date;

  @Field({
    nullable: true,
    description: 'End date for the date filter (optional).',
  })
  end_date?: Date;

  @Field({
    nullable: true,
    description: 'If true, orders the results alphabetically (optional).',
  })
  isAlphabeticalOrder?: boolean;

  @Field({
    nullable: true,
    description: 'Field by which to sort the results (optional).',
  })
  sorting_field?: string;

  @Field({
    nullable: true,
    description:
      'Order of sorting: "ASC" for ascending or "DESC" for descending (optional).',
  })
  sorting_order?: 'ASC' | 'DESC';
}

@InputType({
  description:
    'Input type for fetching a paginated list of contracts for a specific project.',
})
export class GetContractListForProjectsInput {
  @Field({
    description:
      'ID of the business for which project contracts are being fetched.',
  })
  company_id: number;

  @Field({ description: 'Page number for pagination.' })
  page_number: number;

  @Field({ description: 'Number of items per page for pagination.' })
  page_size: number;

  @Field({ description: 'ID of the project to fetch contracts for.' })
  project_id: number;

  @Field({
    nullable: true,
    description:
      'Search keyword to filter contracts by name or other fields (optional).',
  })
  search?: string;

  @Field({
    nullable: true,
    description:
      'Type of date filter to apply (e.g., "This month", "Last month") (optional).',
  })
  date_filter?: string;

  @Field({
    nullable: true,
    description: 'Start date for the date filter (optional).',
  })
  start_date?: Date;

  @Field({
    nullable: true,
    description: 'End date for the date filter (optional).',
  })
  end_date?: Date;

  @Field({
    nullable: true,
    description: 'Field by which to sort the results (optional).',
  })
  sorting_field?: string;

  @Field({
    nullable: true,
    description:
      'Order of sorting: "ASC" for ascending or "DESC" for descending (optional).',
  })
  sorting_order?: 'ASC' | 'DESC';
}
