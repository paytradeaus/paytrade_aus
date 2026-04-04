import { ObjectType, Field } from '@nestjs/graphql';
import {
  ClientSupplierStatus,
  ClientSupplierType,
  EntityType,
  RelatedEntity,
} from 'src/entities/client-suppliers-details.entity';
import { BankAccountType } from 'src/libs/@paytrade-types/paytrade-types';

@ObjectType({
  description:
    'Represents a client or supplier with basic information for list views.',
})
export class ViewClientSuppliersRes {
  @Field({
    nullable: true,
    description: 'Unique internal identifier for this record.',
  })
  id: string;

  @Field({ nullable: true, description: 'The ID of the client or supplier.' })
  client_supplier_id: number;

  @Field({ description: 'business ID that this client/supplier belongs to.' })
  company_id: number;

  @Field({
    nullable: true,
    description: 'Full name of the client or supplier.',
  })
  client_supplier_name: string;

  @Field({
    nullable: true,
    description: 'Business name of the client/supplier, if applicable.',
  })
  business_name: string;

  @Field({ nullable: true, description: 'Type of client/supplier.' })
  client_supplier_type: ClientSupplierType;

  @Field({
    nullable: true,
    description: 'Current status of the client/supplier.',
  })
  client_supplier_status: ClientSupplierStatus;

  @Field({
    nullable: true,
    description: 'Related entity associated with the client/supplier.',
  })
  related_entity: RelatedEntity;

  @Field({
    nullable: true,
    description: 'Type of business entity (Business, Sole Trader, Personal).',
  })
  entity_type: EntityType;

  @Field({
    nullable: true,
    description: 'Place ID for geolocation or mapping purposes.',
  })
  place_id: string;

  @Field({
    nullable: true,
    description: 'Full address of the client/supplier.',
  })
  client_supplier_address: string;

  @Field({ nullable: true, description: 'Country of the client/supplier.' })
  country: string;

  @Field({
    nullable: true,
    description: 'State or region of the client/supplier.',
  })
  region: string;

  @Field({
    nullable: true,
    description: 'Latitude coordinate of the client/supplier location.',
  })
  latitude: string;

  @Field({
    nullable: true,
    description: 'Longitude coordinate of the client/supplier location.',
  })
  longitude: string;

  @Field({
    nullable: true,
    description: 'Phone number of the client/supplier.',
  })
  client_phone_no: string;

  @Field({ nullable: true, description: 'Email ID of the client/supplier.' })
  client_email_id: string;

  @Field({ nullable: true, description: 'Website URL of the client/supplier.' })
  client_website: string;

  @Field({ nullable: true, description: 'QBCC number if applicable.' })
  qbcc_number: string;

  @Field({ nullable: true, description: 'ACN number if applicable.' })
  acn_number: string;

  @Field({ nullable: true, description: 'ABN number if applicable.' })
  abn_number: string;

  @Field({ nullable: true, description: 'TFN number if applicable.' })
  tfn_number: string;

  @Field({
    nullable: true,
    description: 'Payment terms agreed with this client/supplier.',
  })
  payment_terms: number;

  @Field({ nullable: true, description: 'User ID who created this record.' })
  created_by: number;

  @Field({
    nullable: true,
    description: 'Timestamp when this record was created.',
  })
  created_on: Date;

  @Field({
    nullable: true,
    description: 'Number of contracts associated with this client/supplier.',
  })
  contract_count: number;

  @Field({
    nullable: true,
    description: 'Number of claims associated with this client/supplier.',
  })
  claim_count: number;

  @Field({
    nullable: true,
    description:
      'Number of bank accounts associated with this client/supplier.',
  })
  bank_account_count: number;
}

@ObjectType({
  description:
    'Represents a bank account associated with a client or supplier.',
})
export class AccountDetailsList {
  @Field({
    description: 'Unique internal identifier for the bank account record.',
  })
  id: string;

  @Field({ description: 'ID of the bank account.' })
  bank_account_id: number;

  @Field({
    description: 'ID of the client or supplier this account belongs to.',
  })
  client_supplier_id: number;

  @Field({ description: 'Account number for the bank account.' })
  account_number: string;

  @Field({ description: 'Name of the bank account.' })
  account_name: string;

  @Field({
    description: 'Type of bank account (e.g., Project Trust, Retention Trust).',
  })
  account_type: BankAccountType;

  @Field({ description: 'BSB number of the bank account.' })
  bsb_number: number;
}

@ObjectType({
  description:
    'Represents detailed information about a client/supplier including bank accounts.',
})
export class ViewClientSuppliers {
  @Field({
    nullable: true,
    description: 'Unique internal identifier for this record.',
  })
  id: string;

  @Field({ nullable: true, description: 'ID of the client or supplier.' })
  client_supplier_id: number;

  @Field({ description: 'business ID associated with this client/supplier.' })
  company_id: number;

  @Field({
    nullable: true,
    description: 'Full name of the client or supplier.',
  })
  client_supplier_name: string;

  @Field({ nullable: true, description: 'Business name if applicable.' })
  business_name: string;

  @Field({ nullable: true, description: 'Type of client/supplier.' })
  client_supplier_type: ClientSupplierType;

  @Field({ nullable: true, description: 'Status of the client/supplier.' })
  client_supplier_status: ClientSupplierStatus;

  @Field({
    nullable: true,
    description: 'Related entity for the client/supplier.',
  })
  related_entity: RelatedEntity;

  @Field({
    nullable: true,
    description: 'Type of business entity (Business, Sole Trader, Personal).',
  })
  entity_type: EntityType;

  @Field({ nullable: true, description: 'Place ID for mapping purposes.' })
  place_id: string;

  @Field({ nullable: true, description: 'Full address.' })
  client_supplier_address: string;

  @Field({ nullable: true, description: 'Country of the client/supplier.' })
  country: string;

  @Field({ nullable: true, description: 'State or region.' })
  region: string;

  @Field({ nullable: true, description: 'Latitude coordinate.' })
  latitude: string;

  @Field({ nullable: true, description: 'Longitude coordinate.' })
  longitude: string;

  @Field({ nullable: true, description: 'Phone number.' })
  client_phone_no: string;

  @Field({ nullable: true, description: 'Email ID.' })
  client_email_id: string;

  @Field({ nullable: true, description: 'Website URL.' })
  client_website: string;

  @Field({ nullable: true, description: 'QBCC number if available.' })
  qbcc_number: string;

  @Field({ nullable: true, description: 'ACN number if available.' })
  acn_number: string;

  @Field({ nullable: true, description: 'ABN number if available.' })
  abn_number: string;

  @Field({ nullable: true, description: 'TFN number if available.' })
  tfn_number: string;

  @Field({
    nullable: true,
    description: 'Payment terms agreed with client/supplier.',
  })
  payment_terms: number;

  @Field(() => [AccountDetailsList], {
    nullable: true,
    description: 'Bank account details associated with this client/supplier.',
  })
  account_details?: AccountDetailsList[];

  @Field({ nullable: true, description: 'User ID who created the record.' })
  created_by: number;

  @Field({
    nullable: true,
    description: 'Timestamp when the record was created.',
  })
  created_on: Date;
}

@ObjectType({ description: 'Response type for viewing a client/supplier.' })
export class ViewClientSuppliersResponse {
  @Field({ description: 'Response status.' })
  status: string;

  @Field({ description: 'Response message.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Detailed data of the client/supplier.',
  })
  data?: ViewClientSuppliers;
}

@ObjectType({ description: 'Represents a client/supplier record.' })
export class GetClientSuppliersRes {
  @Field({ nullable: true, description: 'Unique internal ID.' })
  id: string;

  @Field({ nullable: true, description: 'Client/Supplier ID.' })
  client_supplier_id: number;

  @Field({ description: 'business ID.' })
  company_id: number;

  @Field({ nullable: true, description: 'Client/Supplier name.' })
  client_supplier_name: string;

  @Field({ nullable: true, description: 'Business name.' })
  business_name: string;

  @Field({ nullable: true, description: 'Client/Supplier type.' })
  client_supplier_type: ClientSupplierType;

  @Field({ nullable: true, description: 'Client/Supplier status.' })
  client_supplier_status: ClientSupplierStatus;

  @Field({ nullable: true, description: 'Related entity.' })
  related_entity: RelatedEntity;

  @Field({ nullable: true, description: 'Type of business entity.' })
  entity_type: EntityType;

  @Field({ nullable: true, description: 'Place ID.' })
  place_id: string;

  @Field({ nullable: true, description: 'Address.' })
  client_supplier_address: string;

  @Field({ nullable: true, description: 'Country.' })
  country: string;

  @Field({ nullable: true, description: 'State or region.' })
  region: string;

  @Field({ description: 'Latitude coordinate.' })
  latitude: string;

  @Field({ nullable: true, description: 'Longitude coordinate.' })
  longitude: string;

  @Field({ nullable: true, description: 'Phone number.' })
  client_phone_no: string;

  @Field({ nullable: true, description: 'Email ID.' })
  client_email_id: string;

  @Field({ nullable: true, description: 'Website URL.' })
  client_website: string;

  @Field({ nullable: true, description: 'QBCC number if available.' })
  qbcc_number: string;

  @Field({ nullable: true, description: 'ACN number if available.' })
  acn_number: string;

  @Field({ nullable: true, description: 'ABN number if available.' })
  abn_number: string;

  @Field({ nullable: true, description: 'TFN number if available.' })
  tfn_number: string;

  @Field({ nullable: true, description: 'Payment terms.' })
  payment_terms: number;

  @Field({ nullable: true, description: 'User ID who created the record.' })
  created_by: number;

  @Field({
    nullable: true,
    description: 'Timestamp when the record was created.',
  })
  created_on: Date;
}

@ObjectType({
  description: 'Response type for retrieving a client/supplier record.',
})
export class GetClientSuppliersResponse {
  @Field({ description: 'Response status.' })
  status: string;

  @Field({ description: 'Response message.' })
  message: string;

  @Field({ nullable: true, description: 'Detailed client/supplier data.' })
  data?: GetClientSuppliersRes;
}
