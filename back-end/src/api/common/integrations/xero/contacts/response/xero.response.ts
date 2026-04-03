import { ObjectType, Field, Int } from '@nestjs/graphql';
import { MappedStatuses } from 'src/libs/@paytrade-types/paytrade-types';

@ObjectType({ description: 'Represents a single Xero contact record' })
export class GetXeroContacts {
  @Field({
    nullable: true,
    description: 'Internal identifier of the Xero contact',
  })
  id: string;

  @Field({ nullable: true, description: 'Xero contact identifier' })
  contact_id: string;

  @Field({ nullable: true, description: 'Tenant identifier in Xero' })
  tenant_id: string;

  @Field({
    nullable: true,
    description:
      'Identifier of the contact this contact has been merged into, if applicable',
  })
  merge_to_contact_id: string;

  @Field({ nullable: true, description: 'Name of the Xero contact' })
  contact_name: string;

  @Field({ nullable: true, description: 'Status of the Xero contact' })
  contact_status: string;

  @Field({ nullable: true, description: 'Mapped status to Paytrade, if any' })
  mapped_status: MappedStatuses;

  @Field({
    nullable: true,
    description: 'Paytrade contact ID this Xero contact is mapped to',
  })
  pt_contact_id: number;

  @Field({
    nullable: true,
    description: 'Paytrade contact name this Xero contact is mapped to',
  })
  pt_contact_name: string;
}

@ObjectType({ description: 'Paginated list of Xero contacts' })
export class GetXeroContactsList {
  @Field(() => [GetXeroContacts], {
    nullable: true,
    description: 'List of Xero contacts',
  })
  contact_list: GetXeroContacts[];

  @Field({ description: 'Total number of Xero contacts available' })
  total_count: Number;
}

@ObjectType({ description: 'Response wrapper for a list of Xero contacts' })
export class GetXeroContactsListResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({ nullable: true, description: 'Xero contacts list payload' })
  data?: GetXeroContactsList;
}

@ObjectType({ description: 'Response wrapper for a single Xero contact' })
export class GetXeroContactsResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({ nullable: true, description: 'Single Xero contact payload' })
  data?: GetXeroContacts;
}

@ObjectType({
  description: 'Represents a Paytrade contact record for list responses',
})
export class GetPaytradeContactsListRes {
  @Field({
    nullable: true,
    description: 'Internal identifier of the Paytrade contact',
  })
  id: string;

  @Field({ nullable: true, description: 'Paytrade contact identifier' })
  contact_id: string;

  @Field({ nullable: true, description: 'Name of the Paytrade contact' })
  contact_name: string;

  @Field({ nullable: true, description: 'Status of the Paytrade contact' })
  contact_status: string;
}

@ObjectType({ description: 'Represents a detailed Paytrade contact record' })
export class GetPaytradeContacts {
  @Field({
    nullable: true,
    description: 'Internal identifier of the Paytrade contact',
  })
  id: string;

  @Field({ nullable: true, description: 'Paytrade contact identifier' })
  contact_id: number;

  @Field({ nullable: true, description: 'Name of the Paytrade contact' })
  contact_name: string;

  @Field({ nullable: true, description: 'Status of the Paytrade contact' })
  contact_status: string;

  @Field({ nullable: true, description: 'Mapped status to Xero, if any' })
  mapped_status: MappedStatuses;

  @Field({
    nullable: true,
    description: 'Xero contact ID this Paytrade contact is mapped to',
  })
  xero_contact_id: string;
}

@ObjectType({ description: 'Paginated list of Paytrade contacts' })
export class GetPaytradeContactsList {
  @Field(() => [GetPaytradeContacts], {
    nullable: true,
    description: 'List of Paytrade contacts',
  })
  contact_list: GetPaytradeContacts[];

  @Field({ description: 'Total number of Paytrade contacts available' })
  total_count: Number;
}

@ObjectType({ description: 'Response wrapper for a list of Paytrade contacts' })
export class GetPaytradeContactsListResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({ nullable: true, description: 'Paytrade contacts list payload' })
  data?: GetPaytradeContactsList;
}

@ObjectType({ description: 'Response wrapper for a single Paytrade contact' })
export class GetPaytradeContactsResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({ nullable: true, description: 'Single Paytrade contact payload' })
  data?: GetPaytradeContacts;
}

@ObjectType({ description: 'Batch create contacts result counts' })
export class BatchCreateContactsData {
  @Field(() => Int, { description: 'Number of contacts successfully created' })
  created: number;

  @Field(() => Int, { description: 'Number of contacts skipped (missing required fields)' })
  skipped: number;

  @Field(() => Int, { description: 'Number of contacts that failed to create' })
  failed: number;
}

@ObjectType({ description: 'Response wrapper for batch contact creation' })
export class BatchCreateContactsResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field(() => BatchCreateContactsData, { nullable: true, description: 'Batch creation result counts' })
  data?: BatchCreateContactsData;
}
