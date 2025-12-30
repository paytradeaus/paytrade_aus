import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType({
  description: 'Represents a CIS (Construction Industry Scheme) tax rate.',
})
export class CISRateRes {
  @Field({ description: 'Unique identifier of the CIS rate.' })
  id: number;

  @Field({ description: 'CIS rate value.' })
  cis_rate: string;
}

@ObjectType({ description: 'Response object for fetching CIS rates.' })
export class CISRateResponse {
  @Field({ description: 'Status of the API response.' })
  status: string;

  @Field({ description: 'Message describing the result of the operation.' })
  message: string;

  @Field(() => [CISRateRes], {
    nullable: true,
    description: 'List of available CIS rates.',
  })
  data?: CISRateRes[];
}
