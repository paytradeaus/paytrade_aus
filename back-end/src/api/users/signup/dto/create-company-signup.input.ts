import { InputType, Field } from '@nestjs/graphql';
import { MinLength } from 'class-validator';
import { EntityType } from 'src/entities/company-details.entity';
import { Group } from 'src/entities/user-details.entity';

@InputType({
  description:
    'Input payload used to create and register a new business during the signup process.',
})
export class CreateCompanySignupInput {
  @Field({
    nullable: true,
    description:
      'Optional internal or registration reference number for the business.',
  })
  company_number: string;

  @Field({
    description: 'Display name of the business as provided during signup.',
  })
  company_name: string;

  @Field({
    nullable: true,
    description:
      'Official legal name of the business, if different from business name.',
  })
  legal_company_name: string;

  @Field({
    description:
      'Primary business email address used for business communication.',
  })
  company_email_id: string;

  @Field({
    description:
      'Business contact phone number. Must be at least 6 characters.',
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
    description: 'Full physical address of the business.',
  })
  company_address: string;

  @Field({
    description: 'Country where the business is registered or operates.',
  })
  country: string;

  @Field({
    description: 'State or region of the business address.',
  })
  region: string;

  @Field({
    description: 'Latitude coordinate of the business location.',
  })
  latitude: string;

  @Field({
    description: 'Longitude coordinate of the business location.',
  })
  longitude: string;

  @Field({
    nullable: true,
    description:
      'QBCC registration number (applicable for Australian construction businesses).',
  })
  qbcc_number: string;

  @Field({
    nullable: true,
    description: 'Australian Business Number (ACN), if applicable.',
  })
  acn_number: string;

  @Field({
    description:
      'Australian Business Number (ABN) or equivalent tax identifier.',
  })
  abn_number: string;

  @Field({
    nullable: true,
    description: 'Tax File Number (TFN), if applicable.',
  })
  tfn_number: string;

  @Field({
    nullable: true,
    description: 'VAT registration number for applicable regions.',
  })
  vat_number: string;

  @Field({
    nullable: true,
    description:
      'Unique Taxpayer Reference (UTR), applicable in certain regions.',
  })
  utr_number: string;

  @Field({
    nullable: true,
    description: 'Construction Industry Scheme (CIS) tax rate, if applicable.',
  })
  cis_rate: number;

  @Field({
    nullable: true,
    description: 'Identifier for the accounting system used by the business.',
  })
  accounting_system: number;

  @Field({
    description: 'Indicates whether the business has been verified.',
  })
  is_verified: Boolean;

  @Field({
    nullable: true,
    description: 'User email associated with the business creation request.',
  })
  email_id: string;

  @Field({
    description:
      'Email verification code sent to validate business email ownership.',
  })
  verification_code: string;

  @Field({
    description: 'Type of verification email sent (e.g., signup, resend).',
  })
  mail_type: string;

  @Field({
    nullable: true,
    description: 'User ID of the logged in user.',
  })
  created_by: number;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the record was created.',
  })
  created_on: Date;

  @Field({
    nullable: true,
    description:
      'Group (User, Admin, System) under which the record is created.',
  })
  created_group: Group;
}

@InputType({
  description:
    'Input payload used to create and register a new business as personal during the user signup process.',
})
export class CreateSystemCompanySignupInput {
  @Field({
    description: 'Display name of the business as provided during signup.',
  })
  company_name: string;

  @Field({
    description:
      'Primary business email address used for business communication.',
  })
  company_email_id: string;

  @Field({
    description:
      'Business contact phone number. Must be at least 6 characters.',
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
    description: 'Full physical address of the business.',
  })
  company_address: string;

  @Field({
    description: 'Country where the business is registered or operates.',
  })
  country: string;

  @Field({
    description: 'State or region of the business address.',
  })
  region: string;

  @Field({
    description: 'Latitude coordinate of the business location.',
  })
  latitude: string;

  @Field({
    description: 'Longitude coordinate of the business location.',
  })
  longitude: string;

  @Field({
    description: 'Indicates whether the business has been verified.',
  })
  is_verified: Boolean;

  @Field({
    description:
      'Indicates whether the business has been created by system or user.',
  })
  is_system_added: Boolean;

  @Field({
    nullable: true,
    description: 'User ID of the logged in user.',
  })
  created_by: number;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the record was created.',
  })
  created_on: Date;

  @Field({
    nullable: true,
    description:
      'Group (User, Admin, System) under which the record is created.',
  })
  created_group: Group;
}
