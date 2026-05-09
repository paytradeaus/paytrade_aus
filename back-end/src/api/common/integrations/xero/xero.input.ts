import { InputType, Int, Field } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import {
  SyncAsDraftStatus,
  XeroStatus,
} from 'src/libs/@paytrade-types/paytrade-types';

@InputType({
  description: 'Input for creating a Xero synchronization log entry',
})
export class CreateXeroSyncLogInput {
  @Field({
    nullable: true,
    description: 'Internal ID for updating an existing log',
  })
  id?: string;

  @Field({ nullable: true, description: 'Name of the API used in the sync' })
  api_name?: string;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Payload sent to the API',
  })
  api_payload?: Record<string, any>;

  @Field({ description: 'Integration ID associated with this sync' })
  integration_id: number;

  @Field({ description: 'Template ID used for logging' })
  log_template_id: number;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Dynamic values used in the template',
  })
  dynamic_values?: Record<string, any>;

  @Field({ nullable: true, description: 'Optional Xero project ID associated' })
  project_id?: string;

  @Field({
    nullable: true,
    description: 'Optional Xero contract ID associated',
  })
  contract_id?: string;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Reference data related to the sync',
  })
  reference?: Record<string, any>;

  @Field(() => [String], {
    nullable: true,
    description: 'History of operations performed in this sync',
  })
  history?: string[];

  @Field({ nullable: true, description: 'Optional reference ID for tracking' })
  reference_id?: string;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Important checks done during sync',
  })
  important_checks?: Record<string, any>;

  @Field({ nullable: true, description: 'Error message if sync failed' })
  error_message?: string;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Records fetched from Xero',
  })
  xero_records?: Record<string, any>[];

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Records fetched from Paytrade',
  })
  paytrade_records?: Record<string, any>[];

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'New records created during sync',
  })
  new_records?: Record<string, any>[];

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Records updated during sync',
  })
  updated_records?: Record<string, any>[];

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Records successfully synced',
  })
  synced_records?: Record<string, any>[];
}

@InputType({ description: 'Input for retrieving Xero synchronization logs' })
export class GetXeroSyncLogsInput {
  @Field({ nullable: true, description: 'Filter by specific log ID' })
  id: string;

  @Field({ nullable: true, description: 'Pagination: page number' })
  page_number?: number;

  @Field({ nullable: true, description: 'Pagination: page size' })
  page_size?: number;

  @Field({ nullable: true, description: 'Date filter type (e.g., created_at)' })
  date_filter: string;

  @Field({ nullable: true, description: 'Start date for filtering logs' })
  start_date: Date;

  @Field({ nullable: true, description: 'End date for filtering logs' })
  end_date: Date;

  @Field({ nullable: true, description: 'Field to sort logs by' })
  sorting_field?: string;

  @Field({ nullable: true, description: 'Sorting order ASC or DESC' })
  sorting_order?: 'ASC' | 'DESC';

  @Field({
    nullable: true,
    description:
      'When true, return only auto-recovered sync logs (templates 493 / 495)',
  })
  recovered_only?: boolean;

  @Field({
    nullable: true,
    description:
      'Optional template.sync_type filter (e.g. Invoices, Bills, Payments, Contacts).',
  })
  sync_type?: string;

  @Field({
    nullable: true,
    description:
      'Optional template.sync_status filter (Succeeded / Warning / Failed).',
  })
  sync_status?: string;
}

@InputType({ description: 'Input to retrieve account codes for a company' })
export class GetAccountCodesInput {
  @Field({ description: 'Company ID' })
  company_id: number;
}

@InputType({ description: 'Input to retrieve tax types for a company' })
export class GetTaxTypeInput {
  @Field({ description: 'Company ID' })
  company_id: number;
}

@InputType({ description: 'Input for creating a new account in Xero/Paytrade' })
export class CreateAccountInput {
  @Field({ description: 'Company ID' })
  company_id: number;

  @Field({ description: 'Name of the account' })
  account_name: string;

  @Field({ nullable: true, description: 'Optional description of the account' })
  description: string;

  @Field({ description: 'Type of the account (e.g., bank, expense, revenue)' })
  account_type: string;

  @Field({ description: 'Unique code for the account' })
  code: string;

  @Field({ description: 'Enable payments to this account' })
  enable_payments_to_account: boolean;
}

@InputType({ description: 'Tax component for a tax type' })
export class TaxComponentInput {
  @Field({ description: 'Name of the tax component' })
  component_name: string;

  @Field({
    nullable: true,
    description: 'Whether the tax component is compound',
  })
  is_compound: boolean;

  @Field({ description: 'Rate of the tax component (percentage)' })
  rate: number;
}

@InputType({ description: 'Input for creating a tax type with components' })
export class CreateTaxTypeInput {
  @Field({ description: 'Company ID' })
  company_id: number;

  @Field({ description: 'Display name for the tax type' })
  display_name: string;

  @Field({ description: 'Report tax type' })
  report_tax_type: string;

  @Field(() => [TaxComponentInput], {
    description: 'Components making up the tax type',
  })
  tax_component: TaxComponentInput[];
}

@InputType({
  description: 'Input for updating company or project accounting settings',
})
export class UpdateSettingsInput {
  @Field({ description: 'Settings ID' })
  id: string;

  @Field({ description: 'Project category ID' })
  project_category_id: string;

  @Field({ nullable: true, description: 'Contract category ID' })
  contract_category_id: string;

  @Field({ description: 'Invoice code' })
  invoice_code: string;

  @Field({ description: 'Bill code' })
  bill_code: string;

  @Field({ nullable: true, description: 'Task #41 — When true, the bill_code on outbound bills is resolved per-supplier (and per-project) instead of using the company-level default. Inbound webhooks may auto-discover the supplier code via naming convention.' })
  bill_code_is_variable: boolean;

  @Field({ nullable: true, description: 'Task #41 — Substring matched (case-insensitive) against the Xero account name during inbound auto-discovery (e.g. "BUILD-" or "Subcontractor").' })
  bill_code_naming_convention: string;

  @Field({ nullable: true, description: 'Task #41 — When variable mode is on AND this is true, the company-level bill_code is used as a fallback when no supplier/project override matches. When false, outbound pushes fail with a sync log.' })
  bill_code_allow_fallback: boolean;

  @Field({
    nullable: true,
    description: 'Retention payable retained account code',
  })
  retention_payable_retained_code: string;

  @Field({
    nullable: true,
    description: 'Retention receivable retained account code',
  })
  retention_receivable_retained_code: string;

  @Field({
    nullable: true,
    description: 'Retention payable release account code',
  })
  retention_payable_release_code: string;

  @Field({
    nullable: true,
    description: 'Retention receivable release account code',
  })
  retention_receivable_release_code: string;

  @Field({ nullable: true, description: 'Liability payable account code' })
  liability_payable_code: string;

  @Field({ nullable: true, description: 'Liability receivable account code' })
  liability_receivable_code: string;

  @Field({ nullable: true, description: 'Whether simplified retention accounting is enabled (no liability accounts)' })
  simplified_retention_accounting: boolean;

  @Field({ nullable: true, description: 'How retention amounts are recorded on Xero retention/liability/release lines: "ex_gst" (default, legacy) or "inc_gst" (force gross-up on Inclusive invoices)' })
  retention_recording_mode: string;

  @Field({ nullable: true, description: 'Explicit Xero taxType to stamp on retention/liability/release lines (overrides account-derived taxType when set)' })
  retention_tax_type: string;

  @Field({ nullable: true, description: 'Phase 3 — Auto-post a balanced GST gross-up Manual Journal in Xero each time retention is recorded. Only meaningful when simplified_retention_accounting=false AND retention_recording_mode="ex_gst".' })
  auto_gross_up_retention_journals: boolean;

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

  @Field({ nullable: true, description: 'Sync contact financial details from PayTrade to Xero' })
  sync_contact_financial_to_xero: boolean;

  @Field({ nullable: true, description: 'Sync contact financial details from Xero to PayTrade' })
  sync_contact_financial_to_pt: boolean;

  @Field({ nullable: true, description: 'Auto-create contracts when Xero claims arrive with no matching contract' })
  smart_contract_auto_create: boolean;

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
    description: 'Sync draft setting for PT to Xero invoices',
  })
  pt_to_xero_invoice_as_draft: SyncAsDraftStatus;

  @Field({
    nullable: true,
    description: 'Sync draft setting for PT to Xero bills',
  })
  pt_to_xero_bill_as_draft: SyncAsDraftStatus;

  @Field({
    nullable: true,
    description: 'Sync draft setting for PT to Xero payments',
  })
  pt_to_xero_payment_as_draft: SyncAsDraftStatus;

  @Field({
    nullable: true,
    description: 'Sync draft setting for Xero to PT invoices',
  })
  xero_to_pt_invoice_as_draft: SyncAsDraftStatus;

  @Field({
    nullable: true,
    description: 'Sync draft setting for Xero to PT bills',
  })
  xero_to_pt_bill_as_draft: SyncAsDraftStatus;

  @Field({
    nullable: true,
    description: 'Sync draft setting for Xero to PT payments',
  })
  xero_to_pt_payment_as_draft: SyncAsDraftStatus;
}
