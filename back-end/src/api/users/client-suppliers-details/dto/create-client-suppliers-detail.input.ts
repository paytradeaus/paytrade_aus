import { InputType, Int, Field } from '@nestjs/graphql';
import { MinLength } from 'class-validator';
import {
  ClientSupplierType,
  EntityType,
  RelatedEntity,
  ClientSupplierStatus,
} from 'src/entities/client-suppliers-details.entity';
import { Group } from 'src/entities/user-details.entity';
import {
  BankAccountStatus,
  BankAccountType,
} from 'src/libs/@paytrade-types/paytrade-types';

@InputType({
  description: 'Input type to create or update a bank account detail.',
})
export class CreateAccountDetailInput {
  @Field({
    nullable: true,
    description:
      'Unique identifier for the account detail (auto-generated if not provided).',
  })
  id?: string;

  @Field({
    nullable: true,
    description: 'ID of the business the account belongs to.',
  })
  company_id?: number;

  @Field({
    description:
      'Type of bank account (e.g., General Account, Project Trust Account, Retention Trust Account).',
  })
  account_type: BankAccountType;

  @Field({ description: 'Name of the bank account.' })
  account_name: string;

  @Field({ nullable: true, description: 'Bank account number (optional).' })
  account_number: string;

  @Field({ description: 'BSB number of the bank account.' })
  bsb_number: number;

  @Field({
    nullable: true,
    description: 'Client or supplier ID associated with the account.',
  })
  client_supplier_id?: number;

  @Field({
    nullable: true,
    description:
      'Indicates if the account was added by the client or supplier.',
  })
  added_by_client_supplier?: Boolean;

  @Field({
    nullable: true,
    description: 'Status of the bank account (Active, Open, etc.).',
  })
  status?: BankAccountStatus;

  @Field({
    nullable: true,
    description: 'User ID of the creator of this record.',
  })
  created_by: number;

  @Field({
    nullable: true,
    description: 'Timestamp when the account detail was created.',
  })
  created_on: Date;

  @Field({
    nullable: true,
    description:
      'Group (User, Admin, System) under which the record was created.',
  })
  created_group: Group;

  @Field({
    nullable: true,
    description: 'User ID of the person who last updated the record.',
  })
  updated_by: number;

  @Field({ nullable: true, description: 'Timestamp of the last update.' })
  updated_on: Date;

  @Field({
    nullable: true,
    description:
      'Group (User, Admin, System) under which the record was last updated.',
  })
  updated_group: Group;
}

@InputType({
  description: 'Input type to create or update a client or supplier detail.',
})
export class CreateClientSuppliersDetailInput {
  @Field({ description: 'ID of the business the client/supplier belongs to.' })
  company_id: number;

  @Field({ description: 'Name of the client or supplier.' })
  client_supplier_name: string;

  @Field({
    nullable: true,
    description: 'Business name if different from client/supplier name.',
  })
  business_name: string;

  @Field({
    description: 'Type of client or supplier (e.g., Client, Supplier).',
  })
  client_supplier_type: ClientSupplierType;

  @Field({
    description: 'Status of the client or supplier (Draft, Completed).',
  })
  client_supplier_status: ClientSupplierStatus;

  @Field({ description: 'Entity related to the client or supplier.' })
  related_entity: RelatedEntity;

  @Field({
    description: 'Type of business entity (Business, Sole Trader, Personal).',
  })
  entity_type: EntityType;

  @Field({
    description:
      'Place ID of the client/supplier location (from Google Maps or internal system).',
  })
  place_id: string;

  @Field({ description: 'Address of the client/supplier.' })
  client_supplier_address: string;

  @Field({ description: 'Country of the client/supplier.' })
  country: string;

  @Field({ description: 'State or region of the client/supplier address.' })
  region: string;

  @Field({
    description: 'Latitude coordinate of the client/supplier location.',
  })
  latitude: string;

  @Field({
    description: 'Longitude coordinate of the client/supplier location.',
  })
  longitude: string;

  @Field({
    description: 'Phone number of the client/supplier.',
    nullable: false,
  })
  @MinLength(6)
  client_phone_no: string;

  @Field({ description: 'Email ID of the client/supplier.' })
  client_email_id: string;

  @Field({ nullable: true, description: 'Website of the client/supplier.' })
  client_website: string;

  @Field({
    nullable: true,
    description: 'QBCC number of the client/supplier if applicable.',
  })
  qbcc_number: string;

  @Field({
    nullable: true,
    description:
      'Australian business Number (ACN) of the client/supplier if applicable.',
  })
  acn_number: string;

  @Field({
    nullable: true,
    description:
      'Australian Business Number (ABN) of the client/supplier if applicable.',
  })
  abn_number: string;

  @Field({
    nullable: true,
    description: 'Tax File Number (TFN) of the client/supplier if applicable.',
  })
  tfn_number: string;

  @Field({
    nullable: true,
    description: 'Default payment terms for the client/supplier.',
  })
  payment_terms: number;

  @Field({
    nullable: true,
    description:
      'Per-contact Xero sales default tax type (e.g. "OUTPUT", "BASEXCLUDED", "GSTONINCOME"). NULL falls back to the organisation default.',
  })
  xero_sales_gst_setting?: string;

  @Field({
    nullable: true,
    description:
      'Per-contact Xero purchases default tax type (e.g. "INPUT", "BASEXCLUDED", "GSTONEXPENSES"). NULL falls back to the organisation default.',
  })
  xero_purchases_gst_setting?: string;

  @Field(() => [CreateAccountDetailInput], {
    nullable: true,
    description: 'List of bank accounts associated with the client/supplier.',
  })
  account_details?: CreateAccountDetailInput[];

  @Field({
    nullable: true,
    description: 'User ID of the creator of this record.',
  })
  created_by?: number;

  @Field({
    nullable: true,
    description: 'Timestamp when the client/supplier record was created.',
  })
  created_on?: Date;

  @Field({
    nullable: true,
    description:
      'Group (User, Admin, System) under which the client/supplier record was created.',
  })
  created_group?: Group;
}
