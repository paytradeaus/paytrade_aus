import { InputType, Int, Field } from '@nestjs/graphql';

@InputType({
  description:
    'Input for listing blog resources with optional filters, sorting, and pagination',
})
export class ListBlogResourceInput {
  @Field({ nullable: true, description: 'Search keyword to filter resources' })
  keyword?: string;

  @Field({
    nullable: true,
    description: 'Filter resources by category ID or name',
  })
  category?: string;

  @Field({
    nullable: true,
    description: 'Filter resources by author ID or name',
  })
  author?: string;

  @Field({
    nullable: true,
    description: 'Filter by content type',
  })
  contentType?: string;

  @Field({
    nullable: true,
    description: 'Filter by status, e.g., "published" or "draft"',
  })
  status?: string;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Page number for pagination',
  })
  page?: number;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Number of resources per page',
  })
  perPage?: number;

  @Field({
    nullable: true,
    description: 'Type of date filter to apply, e.g., "This month, Last month"',
  })
  date_filter?: string;

  @Field({ nullable: true, description: 'Start date for filtering resources' })
  start_date?: Date;

  @Field({ nullable: true, description: 'End date for filtering resources' })
  end_date?: Date;

  @Field({
    nullable: true,
    description: 'Field to sort by, e.g., "created_on"',
  })
  sorting_field?: string;

  @Field({
    nullable: true,
    description: 'Sorting order: ascending or descending',
  })
  sorting_order?: 'ASC' | 'DESC';
}
