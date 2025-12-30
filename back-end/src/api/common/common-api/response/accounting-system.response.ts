import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType({
  description: 'Represents an accounting system supported by the platform.',
})
export class AccountingSystemRes {
  @Field({ description: 'Unique identifier of the accounting system.' })
  id: number;

  @Field({ description: 'Name of the accounting system (e.g., Xero, MYOB).' })
  system: string;
}

@ObjectType({ description: 'Response object for fetching accounting systems.' })
export class AccountingSystemResponse {
  @Field({ description: 'Status of the API response.' })
  status: string;

  @Field({ description: 'Message describing the result of the operation.' })
  message: string;

  @Field(() => [AccountingSystemRes], {
    nullable: true,
    description: 'List of available accounting systems.',
  })
  data?: AccountingSystemRes[];
}
