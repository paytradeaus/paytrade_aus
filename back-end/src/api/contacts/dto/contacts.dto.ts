import { Field, InputType } from '@nestjs/graphql';
import { status } from 'src/entities/contact-submissions.entity';

@InputType({ description: 'Input for submitting a new contact message.' })
export class SubmitAContactInput {
  @Field({ description: 'Name of the contact person.' })
  name: string;

  @Field({
    nullable: true,
    description: 'Optional business name of the contact person.',
  })
  companyName: string;

  @Field({ description: 'Email address of the contact person.' })
  email: string;

  @Field({ description: 'Message or inquiry from the contact person.' })
  message: string;

  @Field({
    nullable: true,
    description: 'reCAPTCHA token for spam prevention.',
  })
  recaptcha_token: string;
}

@InputType({ description: 'Input for searching contacts by email.' })
export class SearchContactByEmailInput {
  @Field({ description: 'Email to search for within contacts.' })
  searchEmail: string;
}

@InputType({ description: 'Input to update the status of a contact message.' })
export class UpdateStatusOfAContactInput {
  @Field({ description: 'Unique identifier of the contact message.' })
  contactId: string;

  @Field({ description: 'New status to set for the contact message.' })
  status: status;
}

@InputType({ description: 'Input for fetching details of a specific contact.' })
export class FetchInformationsOfAContactInput {
  @Field({ description: 'Unique identifier of the contact message.' })
  contactId: string;
}

@InputType({
  description:
    'Input for fetching paginated list of contacts with optional filters.',
})
export class FetchAllContactsInput {
  @Field({ description: 'Page number for pagination.' })
  page_number: number;

  @Field({ description: 'Number of items per page.' })
  page_size: number;

  @Field({
    nullable: true,
    description: 'Optional date filter type, e.g., "This month", "Last month".',
  })
  date_filter: string;

  @Field({ nullable: true, description: 'Start date for date filtering.' })
  start_date: Date;

  @Field({ nullable: true, description: 'End date for date filtering.' })
  end_date: Date;

  @Field({
    nullable: true,
    description: 'Search string for filtering by name, email, or business.',
  })
  search: string;

  @Field({ nullable: true, description: 'Filter contacts by status.' })
  status: status;

  @Field({
    nullable: true,
    description: 'Field to sort the contacts by, e.g., "created_on".',
  })
  sorting_field: string;

  @Field({ nullable: true, description: 'Sorting order, either ASC or DESC.' })
  sorting_order: 'ASC' | 'DESC';
}
