import { InputType, Field, registerEnumType } from '@nestjs/graphql';
import { EntityType } from 'src/entities/company-details.entity';

@InputType({ description: 'Input type for updating company details by admin' })
export class UpdateCompanyDetailsInput {
  @Field({ nullable: true, description: 'Unique ID of the company' })
  company_id?: number;

  @Field({ nullable: true, description: 'Company registration number' })
  company_number?: string;

  @Field({ nullable: true, description: 'Official name of the company' })
  company_name?: string;

  @Field({ nullable: true, description: 'Legal name of the company' })
  legal_company_name?: string;

  @Field({ nullable: true, description: 'Email ID of the company' })
  company_email_id?: string;

  @Field({ nullable: true, description: 'Phone number of the company' })
  company_phone_no?: string;

  @Field({ nullable: true, description: 'Entity type of the company' })
  entity_type?: EntityType;

  @Field({ nullable: true, description: 'Place ID for the company address' })
  place_id?: string;

  @Field({ nullable: true, description: 'Street address of the company' })
  company_address?: string;

  @Field({
    nullable: true,
    description: 'Country where the company is located',
  })
  country?: string;

  @Field({
    nullable: true,
    description: 'State or region of the company address',
  })
  region?: string;

  @Field({
    nullable: true,
    description: 'Latitude coordinate of the company address',
  })
  latitude?: string;

  @Field({
    nullable: true,
    description: 'Longitude coordinate of the company address',
  })
  longitude?: string;

  @Field({
    nullable: true,
    description: 'QBCC registration number (if applicable)',
  })
  qbcc_number?: string;

  @Field({ nullable: true, description: 'Australian Company Number (ACN)' })
  acn_number?: string;

  @Field({ nullable: true, description: 'Australian Business Number (ABN)' })
  abn_number?: string;

  @Field({ nullable: true, description: 'Tax File Number (TFN)' })
  tfn_number?: string;

  @Field({ nullable: true, description: 'Value Added Tax number' })
  vat_number?: string;

  @Field({ nullable: true, description: 'Unique Tax Reference number' })
  utr_number?: string;

  @Field({ nullable: true, description: 'Whether the company is verified' })
  is_verified?: boolean;

  @Field({
    nullable: true,
    description: 'Whether the company is blocked by admin',
  })
  is_admin_blocked?: boolean;

  @Field({
    nullable: true,
    description: 'Whether the company is eligible for a free plan',
  })
  is_free_plan_eligible?: boolean;

  @Field({
    nullable: true,
    description: 'Reason for free plan eligibility or ineligibility',
  })
  free_plan_reason?: string;

  // [Replit Update 2026-03-30] Demo/sandbox mode flag
  @Field({ nullable: true, description: 'Whether this company is a demo/sandbox account' })
  is_demo?: boolean;
}
