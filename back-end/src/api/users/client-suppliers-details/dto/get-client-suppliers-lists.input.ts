import { InputType, Field } from '@nestjs/graphql';
import {
  ClientSupplierStatus,
  ClientSupplierType,
} from 'src/entities/client-suppliers-details.entity';

@InputType({
  description:
    'Input type to fetch a paginated list of client or supplier records for a business.',
})
export class GetClientSuppliersListsInput {
  @Field({
    description: 'ID of the business to fetch client/supplier records for.',
  })
  company_id: number;

  @Field({
    defaultValue: null,
    nullable: true,
    description: 'Page number for paginated results.',
  })
  page_number?: number;

  @Field({
    defaultValue: null,
    nullable: true,
    description: 'Number of items per page for paginated results.',
  })
  page_size?: number;

  @Field({
    nullable: true,
    description: 'Filter client/supplier by status (Draft, Completed).',
  })
  client_supplier_status?: ClientSupplierStatus;

  @Field({
    nullable: true,
    description: 'Filter client/supplier by type (Client, Supplier).',
  })
  client_supplier_type?: ClientSupplierType;

  @Field({
    nullable: true,
    description: 'Type of list to fetch (optional business logic flag).',
  })
  list_type?: string;

  @Field({
    nullable: true,
    description: 'Search term to filter client/supplier records.',
  })
  search?: string;

  @Field({
    nullable: true,
    description:
      'Type of date filter to apply (e.g., "This month", "Last month").',
  })
  date_filter: string;

  @Field({
    nullable: true,
    description: 'Start date for date-based filtering.',
  })
  start_date: Date;

  @Field({ nullable: true, description: 'End date for date-based filtering.' })
  end_date: Date;

  @Field({ nullable: true, description: 'Field name to sort the results by.' })
  sorting_field: string;

  @Field({
    nullable: true,
    description:
      'Sorting order for results: ASC (ascending) or DESC (descending).',
  })
  sorting_order: 'ASC' | 'DESC';
}

@InputType({
  description:
    'Input type to fetch a paginated list of client or supplier records for a specific project.',
})
export class GetClientSuppliersListForProjectsInput {
  @Field({
    description: 'ID of the business to fetch client/supplier records for.',
  })
  company_id: number;

  @Field({
    defaultValue: null,
    nullable: true,
    description: 'Page number for paginated results.',
  })
  page_number?: number;

  @Field({
    defaultValue: null,
    nullable: true,
    description: 'Number of items per page for paginated results.',
  })
  page_size?: number;

  @Field({
    description: 'ID of the project to filter client/supplier records.',
  })
  project_id: number;

  @Field({
    nullable: true,
    description: 'Filter client/supplier by type (Client, Supplier).',
  })
  client_supplier_type?: ClientSupplierType;

  @Field({
    nullable: true,
    description: 'Search term to filter client/supplier records.',
  })
  search?: string;

  @Field({
    nullable: true,
    description:
      'Type of date filter to apply (e.g., "This month", "Last month").',
  })
  date_filter: string;

  @Field({
    nullable: true,
    description: 'Start date for date-based filtering.',
  })
  start_date: Date;

  @Field({ nullable: true, description: 'End date for date-based filtering.' })
  end_date: Date;

  @Field({ nullable: true, description: 'Field name to sort the results by.' })
  sorting_field: string;

  @Field({
    nullable: true,
    description:
      'Sorting order for results: ASC (ascending) or DESC (descending).',
  })
  sorting_order: 'ASC' | 'DESC';
}
