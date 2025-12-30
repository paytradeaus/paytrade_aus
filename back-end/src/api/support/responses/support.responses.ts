import { Field, Int, ObjectType } from '@nestjs/graphql';
export type status = 'Received' | 'Contacted' | 'Closed';

@ObjectType({
  description: 'Represents a newly raised support ticket with its unique ID.',
})
export class RaiseATicket {
  @Field({ description: 'Unique identifier of the newly raised ticket.' })
  id: string;
}

@ObjectType({ description: 'Details of a specific support ticket.' })
export class FetchInformationsOfATicket {
  @Field({ description: 'Unique identifier for the ticket record.' })
  id: string;

  @Field({ description: 'Name of the user who submitted the ticket.' })
  name: string;

  @Field({
    nullable: true,
    description: 'Optional business name of the ticket submitter.',
  })
  companyName: string;

  @Field({ description: 'Email of the user who submitted the ticket.' })
  email: string;

  @Field({ description: 'Content or message of the support ticket.' })
  message: string;

  @Field({ description: 'Current status of the ticket.' })
  status: status;

  @Field({
    description:
      'Indicates whether the ticket has been viewed by the support team.',
  })
  isViewed: boolean;

  @Field({ description: 'Timestamp when the ticket was created.' })
  created_on: Date;
}

@ObjectType({
  description: 'Simplified support ticket info for search results.',
})
export class SearchTicket {
  @Field({ description: 'Unique identifier of the ticket.' })
  id: string;

  @Field({ description: 'Email of the user who submitted the ticket.' })
  email: string;
}

@ObjectType({
  description: 'Paginated list of support tickets for search results.',
})
export class FetchInformationsOfTicketsWithCount {
  @Field(() => [SearchTicket], {
    nullable: true,
    description: 'List of support tickets matching the search criteria.',
  })
  contacts: SearchTicket[];

  @Field(() => Int, {
    description: 'Total number of tickets matching the search criteria.',
  })
  totalCount: number;
}

@ObjectType({
  description: 'Response object for searching tickets by email ID.',
})
export class SearchTicketByEmailIdResponse {
  @Field({ description: 'Status of the response, e.g., SUCCESS or FAILED.' })
  status: string;

  @Field({
    description: 'Informational or error message related to the response.',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing matching tickets and total count.',
  })
  data: FetchInformationsOfTicketsWithCount;
}

@ObjectType({
  description: 'Response after successfully raising a new support ticket.',
})
export class RaiseATicketResponse {
  @Field({ description: 'Status of the response, e.g., SUCCESS or FAILED.' })
  status: string;

  @Field({
    description: 'Informational or error message related to the response.',
  })
  message: string;

  @Field({ nullable: true, description: 'Details of the newly raised ticket.' })
  data: RaiseATicket;
}

@ObjectType({
  description:
    'Response when fetching detailed information of a single ticket.',
})
export class FetchInformationsOfATicketResponse {
  @Field({ description: 'Status of the response.' })
  status: string;

  @Field({ description: 'Message related to the fetch operation.' })
  message: string;

  @Field({ nullable: true, description: 'Details of the fetched ticket.' })
  data: FetchInformationsOfATicket;
}

@ObjectType({ description: 'Paginated list of all support tickets.' })
export class FetchInformationsOfTicketsWithTotalCount {
  @Field(() => [FetchInformationsOfATicket], {
    description: 'List of all support tickets.',
  })
  contacts: FetchInformationsOfATicket[];

  @Field(() => Int, {
    description: 'Total number of support tickets available.',
  })
  totalCount: number;
}

@ObjectType({
  description: 'Response when fetching all support tickets with total count.',
})
export class FetchAllTicketsResponse {
  @Field({ description: 'Status of the response.' })
  status: string;

  @Field({ description: 'Message related to the fetch operation.' })
  message: string;

  @Field({
    description: 'Data containing the list of tickets and total count.',
  })
  data: FetchInformationsOfTicketsWithTotalCount;
}

@ObjectType({
  description: 'Response object after updating the status of a support ticket.',
})
export class UpdateStatusOfATicketResponse {
  @Field({ description: 'Status of the update operation.' })
  status: string;

  @Field({
    description: 'Message indicating success or failure of the update.',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Details of the updated support ticket.',
  })
  data: FetchInformationsOfATicket;
}
