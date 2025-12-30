import { ObjectType, Field } from '@nestjs/graphql';
import { FinancialInstitutionStatus } from 'src/entities/financial-institution-deatils.entity';

@ObjectType({ description: 'Details of a financial institution' })
export class financialInsDetails {
  @Field({ description: 'Unique ID of the financial institution' })
  id: string;

  @Field({ description: 'Code representing the financial institution' })
  institution_code: string;

  @Field({ description: 'Name of the financial institution' })
  institution_name: string;

  @Field({
    nullable: true,
    description: 'Place name or city of the institution',
  })
  place?: string;

  @Field({
    nullable: true,
    description: 'Place ID associated with the institution',
  })
  place_id?: string;

  @Field({
    nullable: true,
    description: 'Address of the financial institution',
  })
  institution_address?: string;

  @Field({
    nullable: true,
    description: 'Country of the financial institution',
  })
  country?: string;

  @Field({ nullable: true, description: 'Region or state of the institution' })
  region?: string;

  @Field({
    nullable: true,
    description: 'Latitude coordinate of the institution',
  })
  latitude?: string;

  @Field({
    nullable: true,
    description: 'Longitude coordinate of the institution',
  })
  longitude?: string;

  @Field({
    nullable: true,
    description:
      'Maximum length of account numbers supported by the institution',
  })
  acc_number_maxlength: number;

  @Field({
    nullable: true,
    description: 'Current status of the financial institution',
  })
  institution_status: FinancialInstitutionStatus;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the record was created',
  })
  created_on: Date;
}

@ObjectType({ description: 'List of financial institutions with total count' })
export class financialInsList {
  @Field(() => [financialInsDetails], {
    nullable: true,
    description: 'Array of financial institution details',
  })
  institutions: financialInsDetails[];

  @Field({ description: 'Total number of financial institutions available' })
  totalCount: number;
}

@ObjectType({ description: 'Response for a single financial institution' })
export class financialInsDetailsResponse {
  @Field({ description: 'Status of the API response, e.g., SUCCESS or FAILED' })
  status: string;

  @Field({
    description: 'Message providing additional information about the response',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Financial institution details if the request was successful',
  })
  data?: financialInsDetails;
}

@ObjectType({ description: 'Response for a list of financial institutions' })
export class financialInsListResponse {
  @Field({ description: 'Status of the API response, e.g., SUCCESS or FAILED' })
  status: string;

  @Field({
    description: 'Message providing additional information about the response',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'List of financial institutions with total count',
  })
  data?: financialInsList;
}
