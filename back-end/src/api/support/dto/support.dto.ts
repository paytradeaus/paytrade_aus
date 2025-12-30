import { Field, InputType } from '@nestjs/graphql';
import { status } from 'src/entities/contact-submissions.entity';

@InputType({ description: 'Input to create a new support ticket.' })
export class CreateSupportTicketInput {
  @Field({ description: 'Name of the user submitting the ticket.' })
  name: string;

  @Field({ nullable: true, description: 'Optional business name of the user.' })
  companyName: string;

  @Field({ description: 'Email address of the user submitting the ticket.' })
  email: string;

  @Field({ description: 'Message or content of the support ticket.' })
  message: string;

  @Field({
    nullable: true,
    description: 'ReCAPTCHA token for verifying user submission.',
  })
  recaptcha_token: string;

  @Field({
    nullable: true,
    description: 'Timezone of the user submitting the ticket.',
  })
  timezone: string;
}

@InputType({ description: 'Input to search support tickets by email address.' })
export class SearchSupportByEmailInput {
  @Field({
    description: 'Email address to search for associated support tickets.',
  })
  searchEmail: string;
}

@InputType({
  description: 'Input to update the status of an existing support ticket.',
})
export class UpdateStatusOfASupportInput {
  @Field({ description: 'Unique ID of the ticket to update.' })
  ticketId: string;

  @Field({ description: 'New status for the support ticket.' })
  status: status;

  @Field({
    nullable: true,
    description: 'Optional message or note associated with the status update.',
  })
  message: string;
}

@InputType({
  description: 'Input to fetch details of a specific support ticket.',
})
export class FetchInformationsOfATicketInput {
  @Field({ description: 'Unique ID of the ticket to fetch.' })
  ticketId: string;
}

@InputType({
  description:
    'Input to fetch all support tickets with pagination and optional filters.',
})
export class FetchAllTicketsInput {
  @Field({ description: 'Page number for pagination.' })
  page_number: number;

  @Field({ description: 'Number of tickets per page.' })
  page_size: number;

  @Field({
    nullable: true,
    description: 'Optional date filter type, e.g., "This month", "Last month".',
  })
  date_filter: string;

  @Field({
    nullable: true,
    description: 'Optional start date for filtering tickets.',
  })
  start_date: Date;

  @Field({
    nullable: true,
    description: 'Optional end date for filtering tickets.',
  })
  end_date: Date;

  @Field({
    nullable: true,
    description: 'Optional search keyword for ticket content or email.',
  })
  search: string;

  @Field({ nullable: true, description: 'Optional ticket status filter.' })
  status: status;

  @Field({ nullable: true, description: 'Field to sort the tickets by.' })
  sorting_field: string;

  @Field({ nullable: true, description: 'Order of sorting: ASC or DESC.' })
  sorting_order: 'ASC' | 'DESC';
}

@InputType({
  description: 'Input to create a new email entry for a support ticket.',
})
export class CreateTicketMailInput {
  @Field({ description: 'Unique ID of the ticket associated with the email.' })
  ticketId: string;

  @Field({ description: 'Email address of the sender.' })
  fromEmail: string;

  @Field({ description: 'Email address of the recipient.' })
  toEmail: string;

  @Field({ nullable: true, description: 'Optional subject of the email.' })
  subject: string;

  @Field({ description: 'Body content of the email.' })
  body: string;

  @Field({
    nullable: true,
    description: 'Whether the email is inbound (from customer) or outbound.',
  })
  isInbound: boolean;

  @Field({ nullable: true, description: 'Unique message ID of the email.' })
  messageId: string;

  @Field({
    nullable: true,
    description: 'Message ID that this email is replying to, if applicable.',
  })
  inReplyTo: string;
}
