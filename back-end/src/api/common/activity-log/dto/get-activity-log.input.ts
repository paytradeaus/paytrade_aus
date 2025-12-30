import { InputType, Int, Field } from '@nestjs/graphql';

@InputType({
  description:
    'Input type for fetching activity logs with optional filters and pagination.',
})
export class GetActivityLogInput {
  @Field({ nullable: true, description: 'Filter logs by user ID.' })
  user_id?: number;

  @Field({ nullable: true, description: 'Filter logs by business ID.' })
  company_id?: number;

  @Field({ nullable: true, description: 'Filter logs by admin ID.' })
  admin_id?: number;

  @Field({ nullable: true, description: 'Filter logs by event group name.' })
  event_group?: string;

  @Field({ nullable: true, description: 'Page number for pagination.' })
  page_number?: number;

  @Field({
    nullable: true,
    description: 'Number of items per page for pagination.',
  })
  page_size?: number;

  @Field({
    nullable: true,
    description: 'Type of date filter, e.g., "created_on", "event_date", etc.',
  })
  date_filter?: string;

  @Field({
    nullable: true,
    description: 'Start date for date range filtering.',
  })
  start_date?: Date;

  @Field({ nullable: true, description: 'End date for date range filtering.' })
  end_date?: Date;

  @Field({ nullable: true, description: 'Field to sort by.' })
  sorting_field?: string;

  @Field({
    nullable: true,
    description: 'Sorting order: "ASC" for ascending, "DESC" for descending.',
  })
  sorting_order?: 'ASC' | 'DESC';
}
