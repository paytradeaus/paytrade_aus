import { InputType, Int, Field } from '@nestjs/graphql';

@InputType({
  description:
    'Input for fetching all system emails with optional filters and pagination',
})
export class FetchAllSystemEmailsInput {
  @Field({
    nullable: true,
    description: 'Start date to filter emails sent from this date',
  })
  emailSentDateFrom: Date;

  @Field({
    nullable: true,
    description: 'End date to filter emails sent up to this date',
  })
  emailSentDateTo: Date;

  @Field({ description: 'Page number for pagination' })
  page: number;

  @Field({
    nullable: true,
    description: 'Number of items per page for pagination',
  })
  itemsPerPage: number;

  @Field({
    nullable: true,
    description: 'Date filter type (e.g., "today", "last_week")',
  })
  date_filter: string;

  @Field({ nullable: true, description: 'Field name to sort the results by' })
  sorting_field?: string;

  @Field({
    nullable: true,
    description: 'Sorting order: ASC for ascending, DESC for descending',
  })
  sorting_order?: 'ASC' | 'DESC';
}
