import { InputType, Field } from '@nestjs/graphql';

@InputType({
  description:
    'Input payload for fetching payment history with filters and pagination',
})
export class GetPaymentHistoryInput {
  @Field({
    nullable: true,
    description: 'Company identifier for which payment history is retrieved',
  })
  company_id: number;

  @Field({
    nullable: true,
    description: 'Filter payments by status',
  })
  status: string;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Page number for pagination',
  })
  page_number?: number;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Number of records per page',
  })
  page_size?: number;

  @Field({
    nullable: true,
    description: 'Predefined date filter (e.g. today, this_month)',
  })
  date_filter: string;

  @Field({
    nullable: true,
    description: 'Start date for filtering payment history',
  })
  start_date: Date;

  @Field({
    nullable: true,
    description: 'End date for filtering payment history',
  })
  end_date: Date;

  @Field({
    nullable: true,
    description: 'Timezone used for date calculations',
  })
  timezone: string;

  @Field({
    nullable: true,
    description: 'Field name used for sorting payment records',
  })
  sorting_field?: string;

  @Field({
    nullable: true,
    description: 'Sorting order: ASC or DESC',
  })
  sorting_order?: 'ASC' | 'DESC';
}
