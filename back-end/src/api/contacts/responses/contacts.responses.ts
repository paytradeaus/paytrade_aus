import { Field, Int, ObjectType } from '@nestjs/graphql';
export type status = 'Received' | 'Contacted' | 'Closed';

@ObjectType({ description: 'Represents a newly submitted contact message.' })
export class SubmitAContact {
  @Field({ description: 'Unique identifier of the submitted contact.' })
  id: string;
}

@ObjectType({
  description: 'Detailed information about a single contact message.',
})
export class FetchInformationsOfAContact {
  @Field({ description: 'Unique identifier of the contact.' })
  id: string;

  @Field({ description: 'Name of the contact person.' })
  name: string;

  @Field({
    nullable: true,
    description: 'Optional business name of the contact person.',
  })
  companyName: string;

  @Field({ description: 'Email address of the contact person.' })
  email: string;

  @Field({ description: 'Message content submitted by the contact person.' })
  message: string;

  @Field({ description: 'Status of the contact message.' })
  status: status;

  @Field({ description: 'Indicates if the contact message has been viewed.' })
  isViewed: boolean;

  @Field({ description: 'Timestamp indicating when the contact was created.' })
  created_on: Date;
}

@ObjectType({ description: 'Represents a basic contact search result.' })
export class SearchContact {
  @Field({ description: 'Unique identifier of the contact.' })
  id: string;

  @Field({ description: 'Email address of the contact.' })
  email: string;
}

@ObjectType({
  description: 'Paginated list of contacts returned from search by email.',
})
export class FetchInformationsOfAContactWithCount {
  @Field(() => [SearchContact], {
    nullable: true,
    description: 'List of contacts matching the search criteria.',
  })
  contacts: SearchContact[];

  @Field(() => Int, {
    description: 'Total number of contacts matching the search.',
  })
  totalCount: number;
}

@ObjectType({
  description: 'Response returned when searching for contacts by email.',
})
export class SearchContactByEmailIdResponse {
  @Field({ description: 'Response status, e.g., SUCCESS or FAILED.' })
  status: string;

  @Field({ description: 'Message describing the response.' })
  message: string;

  @Field({
    nullable: true,
    description:
      'Data containing the list of matching contacts and total count.',
  })
  data: FetchInformationsOfAContactWithCount;
}

@ObjectType({
  description: 'Response returned after submitting a new contact message.',
})
export class SubmitAContactResponse {
  @Field({ description: 'Response status, e.g., SUCCESS or FAILED.' })
  status: string;

  @Field({ description: 'Message describing the response.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing the submitted contact details.',
  })
  data: SubmitAContact;
}

@ObjectType({
  description:
    'Response containing detailed information of a single contact message.',
})
export class FetchInformationsOfAContactResponse {
  @Field({ description: 'Response status, e.g., SUCCESS or FAILED.' })
  status: string;

  @Field({ description: 'Message describing the response.' })
  message: string;

  @Field({ nullable: true, description: 'Data containing contact details.' })
  data: FetchInformationsOfAContact;
}

@ObjectType({ description: 'Paginated list of detailed contact information.' })
export class FetchInformationsOfAContactWithTotalCount {
  @Field(() => [FetchInformationsOfAContact], {
    description: 'List of contact messages.',
  })
  contacts: FetchInformationsOfAContact[];

  @Field(() => Int, { description: 'Total number of contacts available.' })
  totalCount: number;
}

@ObjectType({
  description: 'Response returned when fetching all contacts with pagination.',
})
export class FetchAllContactsResponse {
  @Field({ description: 'Response status, e.g., SUCCESS or FAILED.' })
  status: string;

  @Field({ description: 'Message describing the response.' })
  message: string;

  @Field({ description: 'Data containing list of contacts and total count.' })
  data: FetchInformationsOfAContactWithTotalCount;
}

@ObjectType({
  description: 'Response returned when updating the status of a contact.',
})
export class UpdateStatusOfAContactResponse {
  @Field({ description: 'Response status, e.g., SUCCESS or FAILED.' })
  status: string;

  @Field({ description: 'Message describing the response.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing the updated contact information.',
  })
  data: FetchInformationsOfAContact;
}
