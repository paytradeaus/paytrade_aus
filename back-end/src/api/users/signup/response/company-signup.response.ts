import { ObjectType, Field, Int } from '@nestjs/graphql';
import { SignatureType } from 'src/entities/subscription-details.entity';
import { PlanType } from 'src/entities/subscription-plan-details.entity';
import { AuthRes } from './auth.response';
import { GraphQLJSONObject } from 'graphql-type-json';

@ObjectType({
  description:
    'Represents a business signup record with all associated details.',
})
export class CompanySignupRes {
  @Field({ description: 'Unique identifier for the signup record.' })
  id: string;

  @Field({ description: 'Unique identifier for the business.' })
  company_id: number;

  @Field({
    nullable: true,
    description: 'Official registration or business number, if available.',
  })
  company_number: string;

  @Field({ description: 'Name of the business.' })
  company_name: string;

  @Field({
    nullable: true,
    description:
      'Legal registered name of the business, if different from business name.',
  })
  legal_company_name: string;

  @Field({ description: 'Official email address of the business.' })
  company_email_id: string;

  @Field({
    description: 'Primary phone number of the business. Minimum length: 6.',
  })
  company_phone_no: string;

  @Field({
    description:
      'Type of business entity (e.g., Business, Sole Trader, Personal).',
  })
  entity_type: string;

  @Field({
    description:
      'Google Place ID or unique identifier for the business location.',
  })
  place_id: string;

  @Field({ description: 'Full address of the business.' })
  company_address: string;

  @Field({ description: 'Country in which the business is located.' })
  country: string;

  @Field({ description: 'State or region of the business address.' })
  region: string;

  @Field({ description: 'Latitude coordinate of the business location.' })
  latitude: string;

  @Field({ description: 'Longitude coordinate of the business location.' })
  longitude: string;

  @Field({ nullable: true, description: 'QBCC number, if applicable.' })
  qbcc_number: string;

  @Field({
    nullable: true,
    description: 'Australian Company Number (ACN), if applicable.',
  })
  acn_number: string;

  @Field({
    nullable: true,
    description: 'Australian Business Number (ABN), if applicable.',
  })
  abn_number: string;

  @Field({
    nullable: true,
    description: 'Tax File Number (TFN), if applicable.',
  })
  tfn_number: string;

  @Field({
    nullable: true,
    description: 'VAT number for international businesses, if applicable.',
  })
  vat_number: string;

  @Field({
    nullable: true,
    description: 'Unique Taxpayer Reference (UTR) number, if applicable.',
  })
  utr_number: string;

  @Field({
    nullable: true,
    description: 'CIS rate for construction industry schemes, if applicable.',
  })
  cis_rate: number;

  @Field({
    nullable: true,
    description: 'Accounting system identifier used by the business.',
  })
  accounting_system: number;

  @Field({
    nullable: true,
    description: 'Indicates whether the business has been verified.',
  })
  is_verified: boolean;

  @Field({
    nullable: true,
    description: 'Indicates whether the business is blocked by an admin.',
  })
  is_admin_blocked: boolean;

  @Field({
    nullable: true,
    description: 'Path to uploaded business-related file, if any.',
  })
  file_path?: string;

  @Field({
    nullable: true,
    description: 'Type of uploaded file (e.g., PDF, DOCX).',
  })
  file_type?: string;

  @Field({
    nullable: true,
    description: 'File name or identifier for the uploaded file.',
  })
  file?: string;

  @Field({
    nullable: true,
    description: 'Identifier of the business subscription, if any.',
  })
  subscription_id?: string;

  @Field({
    nullable: true,
    description: 'Digital signature associated with the business.',
  })
  signature?: string;

  @Field({
    nullable: true,
    description: 'Type of signature provided (e.g., IMAGE, CANVAS).',
  })
  signature_type?: SignatureType;

  @Field({
    nullable: true,
    description: 'Name of the subscribed plan, if applicable.',
  })
  plan_name?: string;

  @Field({
    nullable: true,
    description: 'Type of plan (e.g., Basic, Premium).',
  })
  plan_type?: PlanType;

  @Field({
    nullable: true,
    description: 'Expiry date of the subscription plan, if applicable.',
  })
  expiry_date?: Date;

  @Field({
    nullable: true,
    description: 'Indicates if the business has a registered bank account.',
  })
  has_bank_account: boolean;

  @Field({
    nullable: true,
    description: 'Authentication tokens associated with the signup.',
  })
  token: AuthRes;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Email preference settings for the business.',
  })
  email_preferences: Record<string, boolean>;
}

@ObjectType({
  description: 'Response object returned after a business signup attempt.',
})
export class CompanySignupResponse {
  @Field({ description: 'Status of the request (e.g., SUCCESS or ERROR).' })
  status: string;

  @Field({
    description:
      'Message providing additional information about the request result.',
  })
  message: string;

  @Field({
    nullable: true,
    description:
      'Data of the signed-up business, if the request was successful.',
  })
  data?: CompanySignupRes;
}

@ObjectType({
  description: 'Response object containing a list of business signup records.',
})
export class CompanyDetailsResponse {
  @Field({ description: 'Status of the request (e.g., SUCCESS or ERROR).' })
  status: string;

  @Field({
    description:
      'Message providing additional information about the request result.',
  })
  message: string;

  @Field(() => [CompanySignupRes], {
    nullable: true,
    description: 'List of business signup records returned by the request.',
  })
  data?: CompanySignupRes[];
}
