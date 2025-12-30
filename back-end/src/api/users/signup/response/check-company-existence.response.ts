import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType({
  description:
    'Represents the details of a business if it exists in the system.',
})
export class CheckCompanyExistenceRes {
  @Field({ description: 'Unique identifier of the business.' })
  company_id: number;

  @Field({ description: 'Registered name of the business.' })
  company_name: string;

  @Field({
    nullable: true,
    description:
      'Legal registered name of the business, if different from company_name.',
  })
  legal_company_name: string;

  @Field({ description: 'Primary email address associated with the business.' })
  company_email_id: string;

  @Field({
    description:
      'Type of business entity (e.g., Business, Sole Trader, Personal).',
  })
  entity_type: string;

  @Field({ description: 'Place ID associated with the business address.' })
  place_id: string;

  @Field({ description: 'Full address of the business.' })
  company_address: string;

  @Field({ description: 'Country where the business is located.' })
  country: string;

  @Field({ description: 'State or region of the business address.' })
  region: string;

  @Field({ description: 'Latitude coordinate of the business location.' })
  latitude: string;

  @Field({ description: 'Longitude coordinate of the business location.' })
  longitude: string;

  @Field({
    nullable: true,
    description: 'Indicates whether the business has been verified.',
  })
  is_verified: boolean;

  @Field({
    nullable: true,
    description: 'File path for any associated document or attachment.',
  })
  file_path: string;

  @Field({
    nullable: true,
    description: 'Type of file associated with the business record.',
  })
  file_type: string;

  @Field({
    nullable: true,
    description: 'Filename or identifier of the attached file.',
  })
  file: string;
}

@ObjectType({
  description:
    'Response returned after checking whether a business exists in the system.',
})
export class CheckCompanyExistenceResponse {
  @Field({ description: 'Status of the request, e.g., SUCCESS or ERROR.' })
  status: string;

  @Field({ description: 'Message describing the result of the check.' })
  message: string;

  @Field(() => [CheckCompanyExistenceRes], {
    nullable: true,
    description: 'List of business details matching the check criteria.',
  })
  data?: CheckCompanyExistenceRes[];
}
