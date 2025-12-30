import { InputType, Field, registerEnumType } from '@nestjs/graphql';
import { EntityType } from 'src/entities/company-details.entity';

@InputType({ description: 'Input type for admin to create a new company' })
export class AdminCreateCompanyInput {
  @Field({ nullable: true, description: 'ID of the user creating the company' })
  user_id?: number;

  @Field({
    nullable: true,
    description: 'Official company registration number',
  })
  company_number?: string;

  @Field({ nullable: true, description: 'Name of the company' })
  company_name?: string;

  @Field({ nullable: true, description: 'Legal name of the company' })
  legal_company_name?: string;

  @Field({ nullable: true, description: 'Company email address' })
  company_email_id?: string;

  @Field({ nullable: true, description: 'Company phone number' })
  company_phone_no?: string;

  @Field({ nullable: true, description: 'Type of company entity' })
  entity_type?: EntityType;

  @Field({ nullable: true, description: 'Place ID of the company location' })
  place_id?: string;

  @Field({ nullable: true, description: 'Company address' })
  company_address?: string;

  @Field({ nullable: true, description: 'Country of the company' })
  country?: string;

  @Field({ nullable: true, description: 'Region/state of the company' })
  region?: string;

  @Field({ nullable: true, description: 'Latitude of the company location' })
  latitude?: string;

  @Field({ nullable: true, description: 'Longitude of the company location' })
  longitude?: string;

  @Field({
    nullable: true,
    description: 'QBCC (Queensland Building & Construction Commission) number',
  })
  qbcc_number?: string;

  @Field({ nullable: true, description: 'ACN (Australian Company Number)' })
  acn_number?: string;

  @Field({ nullable: true, description: 'ABN (Australian Business Number)' })
  abn_number?: string;

  @Field({ nullable: true, description: 'TFN (Tax File Number)' })
  tfn_number?: string;

  @Field({ nullable: true, description: 'VAT number' })
  vat_number?: string;

  @Field({
    nullable: true,
    description: 'UTR (Unique Taxpayer Reference) number',
  })
  utr_number?: string;

  @Field({
    defaultValue: true,
    description: 'Flag indicating if the company is verified',
  })
  is_verified?: boolean;

  @Field({
    defaultValue: false,
    description: 'Flag indicating if the company is blocked by admin',
  })
  is_admin_blocked?: boolean;

  @Field({
    nullable: true,
    description: 'Construction Industry Scheme (CIS) rate',
  })
  cis_rate?: number;

  @Field({ nullable: true, description: 'Associated accounting system ID' })
  accounting_system?: number;
}
