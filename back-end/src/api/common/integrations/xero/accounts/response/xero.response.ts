import { ObjectType, Field, Int } from '@nestjs/graphql';
import { MappedStatuses } from 'src/libs/@paytrade-types/paytrade-types';

@ObjectType({ description: 'Represents a single Xero account record' })
export class GetXeroAccounts {
  @Field({
    nullable: true,
    description: 'Internal identifier of the Xero account',
  })
  id: string;

  @Field({ nullable: true, description: 'Xero account identifier' })
  account_id: string;

  @Field({ nullable: true, description: 'Tenant identifier in Xero' })
  tenant_id: string;

  @Field({ nullable: true, description: 'Name of the Xero account' })
  account_name: string;

  @Field({ nullable: true, description: 'Status of the Xero account' })
  account_status: string;

  @Field({ nullable: true, description: 'Mapped status to Paytrade, if any' })
  mapped_status: MappedStatuses;

  @Field({
    nullable: true,
    description: 'Paytrade bank account ID this Xero account is mapped to',
  })
  pt_bank_account_id: number;

  @Field({
    nullable: true,
    description: 'Paytrade account name this Xero account is mapped to',
  })
  pt_account_name: string;
}

@ObjectType({ description: 'Paginated list of Xero accounts' })
export class GetXeroAccountsList {
  @Field(() => [GetXeroAccounts], {
    nullable: true,
    description: 'List of Xero accounts',
  })
  account_list: GetXeroAccounts[];

  @Field({ description: 'Total number of Xero accounts available' })
  total_count: Number;
}

@ObjectType({ description: 'Response wrapper for a list of Xero accounts' })
export class GetXeroAccountsListResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({ nullable: true, description: 'Xero accounts list payload' })
  data?: GetXeroAccountsList;
}

@ObjectType({ description: 'Response wrapper for a single Xero account' })
export class GetXeroAccountsResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({ nullable: true, description: 'Single Xero account payload' })
  data?: GetXeroAccounts;
}

@ObjectType({
  description: 'Represents a Paytrade account record for list responses',
})
export class GetPaytradeAccountsListRes {
  @Field({
    nullable: true,
    description: 'Internal identifier of the Paytrade account',
  })
  id: string;

  @Field({ nullable: true, description: 'Paytrade account identifier' })
  account_id: string;

  @Field({ nullable: true, description: 'Name of the Paytrade account' })
  account_name: string;

  @Field({ nullable: true, description: 'Status of the Paytrade account' })
  account_status: string;
}

@ObjectType({ description: 'Represents a detailed Paytrade account record' })
export class GetPaytradeAccounts {
  @Field({
    nullable: true,
    description: 'Internal identifier of the Paytrade account',
  })
  id: string;

  @Field({ nullable: true, description: 'Paytrade account identifier' })
  account_id: string;

  @Field({ nullable: true, description: 'Paytrade account number' })
  account_number: string;

  @Field({ nullable: true, description: 'BSB number of the Paytrade account' })
  bsb_number: number;

  @Field({ nullable: true, description: 'Name of the Paytrade account' })
  account_name: string;

  @Field({ nullable: true, description: 'Status of the Paytrade account' })
  account_status: string;

  @Field({
    nullable: true,
    description: 'Optional description for the account',
  })
  description: string;

  @Field({ nullable: true, description: 'Mapped status to Xero, if any' })
  mapped_status: MappedStatuses;

  @Field({
    nullable: true,
    description: 'Xero bank account ID this Paytrade account is mapped to',
  })
  xero_bank_account_id: string;
}

@ObjectType({ description: 'Paginated list of Paytrade accounts' })
export class GetPaytradeAccountsList {
  @Field(() => [GetPaytradeAccounts], {
    nullable: true,
    description: 'List of Paytrade accounts',
  })
  account_list: GetPaytradeAccounts[];

  @Field({ description: 'Total number of Paytrade accounts available' })
  total_count: Number;
}

@ObjectType({ description: 'Response wrapper for a list of Paytrade accounts' })
export class GetPaytradeAccountsListResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({ nullable: true, description: 'Paytrade accounts list payload' })
  data?: GetPaytradeAccountsList;
}

@ObjectType({ description: 'Response wrapper for a single Paytrade account' })
export class GetPaytradeAccountsResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({ nullable: true, description: 'Single Paytrade account payload' })
  data?: GetPaytradeAccounts;
}

@ObjectType({
  description: 'Per-account error detail for batch bank account creation',
})
export class BatchCreateAccountsError {
  @Field({ nullable: true, description: 'Xero account identifier that failed' })
  account_id?: string;

  @Field({ nullable: true, description: 'Xero account name (for display)' })
  account_name?: string;

  @Field({ description: 'Human-readable reason the account was not created' })
  reason: string;
}

@ObjectType({ description: 'Batch create bank accounts result counts' })
export class BatchCreateAccountsData {
  @Field(() => Int, { description: 'Number of bank accounts successfully created' })
  created: number;

  @Field(() => Int, { description: 'Number of bank accounts skipped (already mapped or missing required fields)' })
  skipped: number;

  @Field(() => Int, { description: 'Number of bank accounts that failed to create' })
  failed: number;

  @Field(() => [BatchCreateAccountsError], {
    nullable: true,
    description: 'Per-account error detail for skipped/failed rows',
  })
  errors?: BatchCreateAccountsError[];
}

@ObjectType({ description: 'Response wrapper for batch bank account creation' })
export class BatchCreateAccountsResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field(() => BatchCreateAccountsData, { nullable: true, description: 'Batch creation result counts' })
  data?: BatchCreateAccountsData;
}
