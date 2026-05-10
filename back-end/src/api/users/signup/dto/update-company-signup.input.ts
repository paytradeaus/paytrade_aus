import { InputType, Field } from '@nestjs/graphql';
import { MinLength } from 'class-validator';
import { EntityType } from 'src/entities/company-details.entity';
import { SignatureType } from 'src/entities/subscription-details.entity';
import { Group } from 'src/entities/user-details.entity';
import { GraphQLJSONObject } from 'graphql-type-json';

@InputType({
  description:
    'Input payload used to update existing business signup and business profile details.',
})
export class UpdateCompanySignupInput {
  @Field({
    description: 'Unique identifier of the business.',
  })
  company_id: number;

  @Field({
    description: 'Registered name of the business.',
  })
  company_name: string;

  @Field({
    description: 'Primary business email address of the business.',
  })
  company_email_id: string;

  @Field({
    nullable: true,
    description: 'Internal or registration number of the business.',
  })
  company_number: string;

  @Field({
    nullable: true,
    description: 'Legal registered name of the business.',
  })
  legal_company_name: string;

  @Field({
    description:
      'Primary contact phone number of the business (minimum 6 characters).',
  })
  @MinLength(6)
  company_phone_no: string;

  @Field({
    description:
      'Type of business entity (e.g., Business, Sole Trader, Personal).',
  })
  entity_type: EntityType;

  @Field({
    description: 'Google Place ID representing the business location.',
  })
  place_id: string;

  @Field({
    description: 'Full address of the business.',
  })
  company_address: string;

  @Field({
    description: 'Country where the business is registered.',
  })
  country: string;

  @Field({
    description: 'State or region of the business address.',
  })
  region: string;

  @Field({
    description: 'Latitude coordinate of the business address.',
  })
  latitude: string;

  @Field({
    description: 'Longitude coordinate of the business address.',
  })
  longitude: string;

  @Field({
    nullable: true,
    description: 'Queensland Building and Construction Commission number.',
  })
  qbcc_number: string;

  @Field({
    nullable: true,
    description: 'Australian Company Number (ACN).',
  })
  acn_number: string;

  @Field({
    description: 'Australian Business Number (ABN).',
  })
  abn_number: string;

  @Field({
    nullable: true,
    description: 'Tax File Number (TFN), if applicable.',
  })
  tfn_number: string;

  @Field({
    nullable: true,
    description: 'Value Added Tax (VAT) registration number.',
  })
  vat_number: string;

  @Field({
    nullable: true,
    description: 'Unique Taxpayer Reference (UTR) number.',
  })
  utr_number: string;

  @Field({
    nullable: true,
    description: 'Construction Industry Scheme (CIS) tax rate.',
  })
  cis_rate: number;

  @Field({
    nullable: true,
    description: 'Accounting system identifier used by the business.',
  })
  accounting_system: number;

  @Field({
    nullable: true,
    description: 'Indicates whether the business is verified.',
  })
  is_verified: Boolean;

  @Field({
    nullable: true,
    description: 'Verification code used during email or detail updates.',
  })
  verification_code: string;

  @Field({
    nullable: true,
    description: 'Previous business email address before update.',
  })
  old_company_email_id: string;

  @Field({
    nullable: true,
    description: 'Authorized digital signature of the business.',
  })
  signature: string;

  @Field({
    nullable: true,
    description: 'Type of signature provided (e.g., IMAGE, CANVAS).',
  })
  signature_type: SignatureType;

  @Field({
    nullable: true,
    description: 'User ID of the logged in user who updated the record.',
  })
  updated_by: number;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the record was updated.',
  })
  updated_on: Date;

  @Field({
    nullable: true,
    description:
      'Group (User, Admin, System) under which the record was updated.',
  })
  updated_group: Group;

  @Field({
    nullable: true,
    description: 'Indicates whether the business signature was updated.',
  })
  is_signature_updated: boolean;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description:
      'Email notification preferences mapped by event type with boolean values.',
  })
  email_preferences: Record<string, boolean>;

  @Field({
    nullable: true,
    description:
      'Whether the business is registered for GST. NULL = unknown. Surfaces on the Business Profile and feeds the contact GST resolver as the final fallback.',
  })
  is_gst_registered?: boolean;

  @Field({
    nullable: true,
    description:
      'Task #97: per-company toggle for delegated notice auto-send. NULL/TRUE = default (auto-send when subscription allows). FALSE = explicitly opted out — generate notice but do not auto-send mail.',
  })
  notices_auto_send?: boolean;
}
