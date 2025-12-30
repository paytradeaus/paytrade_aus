import { Field, Int, ObjectType } from '@nestjs/graphql';
import { StringResponse } from 'src/api/users/signup/response/auth.response';

@ObjectType({
  description:
    'Details of a support ticket including user information and messages.',
})
class SupportTicketDetail {
  @Field({ description: 'Unique identifier for the support ticket record.' })
  id: string;

  @Field({ description: 'Ticket number associated with this support ticket.' })
  ticket_id: number;

  @Field({ description: 'Name of the user who submitted the ticket.' })
  name: string;

  @Field({
    nullable: true,
    description: 'Optional business name of the user who submitted the ticket.',
  })
  companyName: string;

  @Field({ description: 'Email address of the user who submitted the ticket.' })
  email: string;

  @Field({ description: 'Content or message of the support ticket.' })
  message: string;

  @Field({ description: 'Current status of the support ticket.' })
  status: string;

  @Field({
    description:
      'Indicates whether the ticket has been viewed by support team.',
  })
  isViewed: boolean;

  @Field({ description: 'Timestamp indicating when the ticket was created.' })
  created_on: Date;

  @Field(() => [TicketMailDetail], {
    nullable: true,
    description: 'List of emails associated with the ticket.',
  })
  ticket_details?: TicketMailDetail[];
}

@ObjectType({
  description: 'Details of an email associated with a support ticket.',
})
class TicketMailDetail {
  @Field({ description: 'Unique identifier for the email record.' })
  id: string;

  @Field({ description: 'Sender email address.' })
  fromEmail: string;

  @Field({ description: 'Recipient email address.' })
  toEmail: string;

  @Field({ description: 'Subject of the email.' })
  subject: string;

  @Field({ description: 'Body content of the email.' })
  body: string;

  @Field({ description: 'Timestamp indicating when the email was created.' })
  created_on: Date;

  @Field({
    nullable: true,
    description:
      'Indicates whether the email was sent by a user (true) or support agent (false).',
  })
  is_user?: boolean;
}

// Response for fetching ticket by ID
@ObjectType({
  description: 'Response for fetching a single support ticket by ID.',
})
export class GetSupportTicketByIdResponse extends StringResponse {
  @Field({
    nullable: true,
    description: 'Detailed information of the requested support ticket.',
  })
  data: SupportTicketDetail;
}

// Internal object for list response
@ObjectType({
  description: 'Internal object to structure the support ticket list response.',
})
class GetSupportTicketListObj {
  @Field(() => [SupportTicketDetail], {
    description: 'List of support tickets.',
  })
  contacts: SupportTicketDetail[];

  @Field(() => Int, {
    nullable: true,
    description: 'Total number of support tickets in the list.',
  })
  totalCount: number;
}

// Response for fetching list of tickets
@ObjectType({
  description: 'Response for fetching a paginated list of support tickets.',
})
export class GetSupportTicketListResponse extends StringResponse {
  @Field({
    nullable: true,
    description: 'Data containing the list of support tickets and total count.',
  })
  data: GetSupportTicketListObj;
}

// Response for updating a support ticket
@ObjectType({ description: 'Response for updating a support ticket.' })
export class UpdateSupportTicketResponse extends StringResponse {
  @Field({
    nullable: true,
    description: 'Detailed information of the updated support ticket.',
  })
  data: SupportTicketDetail;
}
