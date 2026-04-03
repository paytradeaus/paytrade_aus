import { ObjectType, Field } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import {
  Integrations,
  IntegrationStatus,
  MappedStatuses,
  ProviderTpe,
  SyncAsDraftStatus,
  XeroProcess,
  XeroStatus,
} from 'src/libs/@paytrade-types/paytrade-types';

@ObjectType({ description: 'Represents a tracking category in Xero/Paytrade' })
export class GetTrackingCategory {
  @Field({ nullable: true, description: 'ID of the tracking category' })
  id: string;

  @Field({ nullable: true, description: 'Name of the tracking category' })
  name: string;

  @Field({
    nullable: true,
    description: 'Status of the tracking category (active/inactive)',
  })
  status: string;
}

@ObjectType({ description: 'List of tracking categories with total count' })
export class GetTrackingCategoryList {
  @Field(() => [GetTrackingCategory], {
    nullable: true,
    description: 'Array of tracking categories',
  })
  tracking_category_list?: GetTrackingCategory[];

  @Field({ description: 'Total number of tracking categories' })
  total_count: number;
}

@ObjectType({ description: 'Response wrapper for tracking category list' })
export class GetTrackingCategoryListResponse {
  @Field({ description: 'Status of the response' })
  status: string;

  @Field({
    description: 'Message providing additional info about the response',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing tracking category list',
  })
  data?: GetTrackingCategoryList;
}

@ObjectType({
  description: 'Represents a Xero integration configuration and settings',
})
export class XeroResponse {
  @Field({ nullable: true, description: 'Unique ID of the integration record' })
  id: string;

  @Field({ nullable: true, description: 'Integration ID' })
  integration_id: number;

  @Field({
    nullable: true,
    description: 'Company ID associated with integration',
  })
  company_id: number;

  @Field({ nullable: true, description: 'Tenant ID' })
  tenant_id: string;

  @Field({ nullable: true, description: 'Tenant name' })
  tenant_name: string;

  @Field({ nullable: true, description: 'Tenant type' })
  tenant_type: string;

  @Field({ nullable: true, description: 'Integration status' })
  status: string;

  @Field({ nullable: true, description: 'Project category ID associated' })
  project_category_id: string;

  @Field({ nullable: true, description: 'Contract category ID associated' })
  contract_category_id: string;

  @Field({ nullable: true, description: 'Project category name' })
  project_category_name: string;

  @Field({ nullable: true, description: 'Contract category name' })
  contract_category_name: string;

  @Field({ nullable: true, description: 'Integration list ID' })
  integration_list_id: string;

  @Field({ nullable: true, description: 'Name of the integration provider' })
  integration_name: Integrations;

  @Field({ nullable: true, description: 'Type of the integration provider' })
  integration_type: ProviderTpe;

  @Field({ nullable: true, description: 'Status of the integration' })
  integration_status: IntegrationStatus;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Action buttons available for the integration',
  })
  action_buttons: Record<string, any>;

  @Field({ nullable: true, description: 'Invoice code' })
  invoice_code: string;

  @Field({ nullable: true, description: 'Bill code' })
  bill_code: string;

  @Field({ nullable: true, description: 'Retention payable retained code' })
  retention_payable_retained_code: string;

  @Field({ nullable: true, description: 'Retention payable release code' })
  retention_payable_release_code: string;

  @Field({ nullable: true, description: 'Retention receivable retained code' })
  retention_receivable_retained_code: string;

  @Field({ nullable: true, description: 'Retention receivable release code' })
  retention_receivable_release_code: string;

  @Field({ nullable: true, description: 'Liability payable code' })
  liability_payable_code: string;

  @Field({ nullable: true, description: 'Liability receivable code' })
  liability_receivable_code: string;

  @Field({ nullable: true, description: 'Whether simplified retention accounting is enabled (no liability accounts)' })
  simplified_retention_accounting: boolean;

  @Field({ nullable: true, description: 'Auto-create new PayTrade bank accounts in Xero' })
  pt_to_xero_bank_auto_create: boolean;

  @Field({ nullable: true, description: 'Auto-create new Xero bank accounts in PayTrade (as draft)' })
  xero_to_pt_bank_auto_create: boolean;

  @Field({ nullable: true, description: 'Auto-create new PayTrade contacts in Xero' })
  pt_to_xero_contact_auto_create: boolean;

  @Field({ nullable: true, description: 'Auto-create new Xero contacts in PayTrade' })
  xero_to_pt_contact_auto_create: boolean;

  @Field({ nullable: true, description: 'Auto-create new PayTrade projects in Xero' })
  pt_to_xero_project_auto_create: boolean;

  @Field({ nullable: true, description: 'Auto-create new Xero projects in PayTrade' })
  xero_to_pt_project_auto_create: boolean;

  @Field({ nullable: true, description: 'Auto-create new PayTrade contracts in Xero' })
  pt_to_xero_contract_auto_create: boolean;

  @Field({ nullable: true, description: 'Auto-create new Xero contracts in PayTrade' })
  xero_to_pt_contract_auto_create: boolean;

  @Field({ nullable: true, description: 'Invoice tax code' })
  invoice_tax_code: string;

  @Field({ nullable: true, description: 'Bill tax code' })
  bill_tax_code: string;

  @Field({ nullable: true, description: 'Reference format for invoices/bills' })
  reference_format: string;

  @Field({ nullable: true, description: 'Wait time for sync operations' })
  wait_time: number;

  @Field({
    nullable: true,
    description: 'Sync setting for PT to Xero invoices as draft',
  })
  pt_to_xero_invoice_as_draft: SyncAsDraftStatus;

  @Field({
    nullable: true,
    description: 'Sync setting for PT to Xero bills as draft',
  })
  pt_to_xero_bill_as_draft: SyncAsDraftStatus;

  @Field({
    nullable: true,
    description: 'Sync setting for PT to Xero payments as draft',
  })
  pt_to_xero_payment_as_draft: SyncAsDraftStatus;

  @Field({
    nullable: true,
    description: 'Sync setting for Xero to PT invoices as draft',
  })
  xero_to_pt_invoice_as_draft: SyncAsDraftStatus;

  @Field({
    nullable: true,
    description: 'Sync setting for Xero to PT bills as draft',
  })
  xero_to_pt_bill_as_draft: SyncAsDraftStatus;

  @Field({
    nullable: true,
    description: 'Sync setting for Xero to PT payments as draft',
  })
  xero_to_pt_payment_as_draft: SyncAsDraftStatus;
}

@ObjectType({
  description: 'Response wrapper for Xero integration configuration',
})
export class GetXeroResponse {
  @Field({ description: 'Status of the response' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({ nullable: true, description: 'Data containing Xero configuration' })
  data?: XeroResponse;
}

@ObjectType({ description: 'Represents auto-mapping statistics' })
export class AutoMap {
  @Field({ nullable: true, description: 'Number of mapped items' })
  mapped?: number;

  @Field({ nullable: true, description: 'Number of unmapped items' })
  unmapped?: number;

  @Field({ nullable: true, description: 'Total number of items' })
  total?: number;
}

@ObjectType({ description: 'Response wrapper for auto-map statistics' })
export class AutoMapResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({ nullable: true, description: 'Auto-map statistics' })
  data?: AutoMap;
}

@ObjectType({ description: 'Represents dashboard counts by type and status' })
export class DashboardCount {
  @Field({ nullable: true, description: 'Type of item' })
  type?: string;

  @Field({ nullable: true, description: 'Status of item' })
  status?: string;

  @Field({ nullable: true, description: 'Count of items for this type/status' })
  status_count?: number;
}

@ObjectType({ description: 'Response wrapper for dashboard counts' })
export class DashboardCountResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field(() => [DashboardCount], {
    nullable: true,
    description: 'Array of dashboard counts',
  })
  data: DashboardCount[];
}

@ObjectType({ description: 'Represents reference IDs for Xero and Paytrade' })
export class ReferenceResponse {
  @Field({ nullable: true, description: 'Xero ID reference' })
  xeroId: string;

  @Field({ nullable: true, description: 'Paytrade ID reference' })
  paytradeId: string;
}

@ObjectType({
  description: 'Represents a Xero/Paytrade synchronization log entry',
})
export class SyncLog {
  @Field({ nullable: true, description: 'Sync log ID' })
  id: string;

  @Field({ nullable: true, description: 'Sync operation ID' })
  sync_id: number;

  @Field({
    nullable: true,
    description: 'Integration ID associated with this sync',
  })
  integration_id: number;

  @Field({ nullable: true, description: 'Log template ID used for sync' })
  log_template_id: number;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Dynamic values in sync',
  })
  dynamic_values?: Record<string, any>;

  @Field({ nullable: true, description: 'Reference IDs for Xero/Paytrade' })
  reference: ReferenceResponse;

  @Field({ nullable: true, description: 'Sync status' })
  sync_status: XeroStatus;

  @Field({ nullable: true, description: 'Project ID associated with sync' })
  project_id: string;

  @Field({ nullable: true, description: 'Project name' })
  project_name: string;

  @Field({ nullable: true, description: 'Contract ID associated with sync' })
  contract_id: string;

  @Field({ nullable: true, description: 'Contract name' })
  contract_name: string;

  @Field({ nullable: true, description: 'Type of sync' })
  sync_type: string;

  @Field({ nullable: true, description: 'Description of the sync' })
  description: string;

  @Field({ nullable: true, description: 'Process type of sync' })
  process: XeroProcess;

  @Field({
    nullable: true,
    description: 'Indicates if sync originated from Xero',
  })
  from_xero: boolean;

  @Field({ nullable: true, description: 'Timestamp of record creation' })
  created_on: Date;

  @Field({ nullable: true, description: 'Paytrade ID linked to sync' })
  paytrade_id: string;

  @Field({ nullable: true, description: 'Xero ID linked to sync' })
  xero_id: string;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Details from Paytrade',
  })
  paytrade_details?: Record<string, any>;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Details from Xero',
  })
  xero_details?: Record<string, any>;

  @Field({ nullable: true, description: 'Reference ID' })
  reference_id: string;

  @Field(() => [String], { nullable: true, description: 'History of actions' })
  history: string[];

  @Field({ nullable: true, description: 'Notification message' })
  notification: string;

  @Field({
    nullable: true,
    description: 'Information required for sync completion',
  })
  information_required: string;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Important checks during sync',
  })
  important_checks: Record<string, any>;

  @Field({ nullable: true, description: 'Error message if sync failed' })
  error_message: string;

  @Field({ nullable: true, description: 'Error code if sync failed' })
  error_code: string;

  @Field(() => [GraphQLJSONObject], {
    nullable: true,
    description: 'Records fetched from Xero',
  })
  xero_records: Record<string, any>[];

  @Field(() => [GraphQLJSONObject], {
    nullable: true,
    description: 'Records fetched from Paytrade',
  })
  paytrade_records: Record<string, any>[];

  @Field(() => [GraphQLJSONObject], {
    nullable: true,
    description: 'New records created during sync',
  })
  new_records: Record<string, any>[];

  @Field(() => [GraphQLJSONObject], {
    nullable: true,
    description: 'Updated records during sync',
  })
  updated_records: Record<string, any>[];

  @Field(() => [GraphQLJSONObject], {
    nullable: true,
    description: 'Successfully synced records',
  })
  synced_records: Record<string, any>[];

  @Field({ nullable: true, description: 'API name used in the sync' })
  api_name: string;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'API payload sent during sync',
  })
  api_payload: Record<string, any>;
}

@ObjectType({ description: 'Represents a paginated list of sync logs' })
export class GetSyncLogs {
  @Field(() => [SyncLog], {
    nullable: true,
    description: 'Array of Xero sync logs',
  })
  xero_logs?: SyncLog[];

  @Field({ description: 'Total number of sync logs available' })
  total_count: number;

  @Field(() => [GraphQLJSONObject], {
    nullable: true,
    description: 'Count of logs grouped by type/status',
  })
  count: Record<string, any>[];
}

@ObjectType({ description: 'Response wrapper for fetching sync logs' })
export class GetSyncLogsResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({ nullable: true, description: 'Data containing sync logs' })
  data?: GetSyncLogs;
}

@ObjectType({ description: 'Response for viewing a single sync log' })
export class ViewSyncLogResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({ nullable: true, description: 'Data containing a single sync log' })
  data?: SyncLog;
}

@ObjectType({
  description: 'Represents a chart of accounts code in Xero/Paytrade',
})
export class AccountCodes {
  @Field({ nullable: true, description: 'Account ID' })
  id: string;

  @Field({ nullable: true, description: 'Name of the account' })
  name: string;

  @Field({ nullable: true, description: 'Account code' })
  code: string;

  @Field({
    nullable: true,
    description: 'Type of the account (e.g., Expense, Asset)',
  })
  type: string;

  @Field({
    nullable: true,
    description: 'Status of the account (active/inactive)',
  })
  status: string;
}

@ObjectType({ description: 'Response wrapper for account codes' })
export class GetAccountCodesResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field(() => [AccountCodes], {
    nullable: true,
    description: 'List of account codes',
  })
  data?: AccountCodes[];
}

@ObjectType({ description: 'Represents a tax rate in Xero/Paytrade' })
export class TaxRates {
  @Field({ nullable: true, description: 'Name of the tax rate' })
  name: string;

  @Field({ nullable: true, description: 'Type of tax (e.g., GST, VAT)' })
  type: string;

  @Field({
    nullable: true,
    description: 'Status of the tax rate (active/inactive)',
  })
  status: string;
}

@ObjectType({ description: 'Response wrapper for tax rates' })
export class GetTaxRateResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field(() => [TaxRates], { nullable: true, description: 'List of tax rates' })
  data?: TaxRates[];
}

@ObjectType({ description: 'Represents an organisation/tenant' })
export class Organisation {
  @Field({ nullable: true, description: 'Short code of the organisation' })
  short_code?: string;
}

@ObjectType({ description: 'Response wrapper for organisation data' })
export class OrganisationResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({ nullable: true, description: 'Organisation data' })
  data?: Organisation;
}
