import { ObjectType, Field } from '@nestjs/graphql';
import { EntityType } from 'src/entities/company-details.entity';
import { SubsciptionPlanStatus } from 'src/entities/subscription-details.entity';

@ObjectType({ description: 'Represents a PT company and its details' })
export class PTCompany {
  @Field({ nullable: true, description: 'Unique internal ID of the company' })
  id: string;

  @Field({ nullable: true, description: 'Company identifier number' })
  company_id: number;

  @Field({ nullable: true, description: 'Name of the company' })
  company_name: string;

  @Field({ nullable: true, description: 'Legal name of the company' })
  legal_company_name: string;

  @Field({ nullable: true, description: 'Company email address' })
  company_email_id?: string;

  @Field({ nullable: true, description: 'Company phone number' })
  company_phone_no?: string;

  @Field({ nullable: true, description: 'Type of business entity' })
  entity_type?: EntityType;

  @Field({
    nullable: true,
    description: 'Place ID associated with the company location',
  })
  place_id?: string;

  @Field({ nullable: true, description: 'Address of the company' })
  company_address?: string;

  @Field({
    nullable: true,
    description: 'Country where the company is located',
  })
  country?: string;

  @Field({ nullable: true, description: 'Region or state of the company' })
  region?: string;

  @Field({
    nullable: true,
    description: 'Latitude coordinate of the company location',
  })
  latitude?: string;

  @Field({
    nullable: true,
    description: 'Longitude coordinate of the company location',
  })
  longitude?: string;

  @Field({ nullable: true, description: 'QBCC registration number' })
  qbcc_number?: string;

  @Field({ nullable: true, description: 'Australian Company Number' })
  acn_number?: string;

  @Field({ nullable: true, description: 'Australian Business Number' })
  abn_number?: string;

  @Field({ nullable: true, description: 'Tax File Number' })
  tfn_number?: string;

  @Field({ nullable: true, description: 'VAT registration number' })
  vat_number?: string;

  @Field({ nullable: true, description: 'Unique Tax Reference number' })
  utr_number?: string;

  @Field({
    nullable: true,
    description: 'Indicates whether the company is verified',
  })
  is_verified: boolean;

  @Field({
    nullable: true,
    description: 'Indicates whether the company is blocked by admin',
  })
  is_admin_blocked: boolean;

  @Field({ nullable: true, description: 'Path to the company icon file' })
  icon_file_path: string;

  @Field({ nullable: true, description: 'File type of the company icon' })
  icon_file_type: string;

  @Field({
    nullable: true,
    description: 'Base64-encoded string of the company icon',
  })
  icon_base64: string;

  @Field({ nullable: true, description: 'ID of the company subscription' })
  subscription_id: number;

  @Field({ nullable: true, description: 'ID of the subscription plan' })
  plan_id: number;

  @Field({
    nullable: true,
    description: 'Current status of the subscription plan',
  })
  subscription_status: SubsciptionPlanStatus;

  @Field({ nullable: true, description: 'Expiry date of the subscription' })
  expiry_date: Date;

  @Field({ nullable: true, description: 'Name of the subscription plan' })
  plan_name: string;

  @Field({
    nullable: true,
    description: 'ID of the primary admin of the company',
  })
  primary_admin_id: number;

  @Field({
    nullable: true,
    description: 'Name of the primary admin of the company',
  })
  primary_admin_name: string;

  @Field({
    nullable: true,
    description: 'Indicates if the company is eligible for a free plan',
  })
  is_free_plan_eligible?: boolean;

  @Field({ nullable: true, description: 'Reason for free plan eligibility' })
  free_plan_reason?: string;
}

@ObjectType({ description: 'Response object for fetching a PT company' })
export class PTCompanyResponse {
  @Field({ description: 'Status of the response, e.g., SUCCESS or FAILED' })
  status: string;

  @Field({ description: 'Message describing the response' })
  message: string;

  @Field({
    nullable: true,
    description: 'PT company data if the request was successful',
  })
  data?: PTCompany;
}
