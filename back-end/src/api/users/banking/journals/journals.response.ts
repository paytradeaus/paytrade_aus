import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import {
  BalanceCheck,
  BankAccountStatus,
  BankAccountType,
  NilReturnStatus,
  ReconcileStatus,
  ReportStatus,
} from 'src/libs/@paytrade-types/paytrade-types';
import { GetFileRes } from '../../file-upload/response/get-file.response';

@ObjectType({
  description:
    'Task #91 — single PayTrade trust-ledger journal row associated with a claim or one of its payments.',
})
export class ClaimTrustJournalRow {
  @Field({ description: 'Journal entry uuid.' })
  id: string;

  @Field({ description: 'PayTrade journal number.' })
  journal_number: number;

  @Field({ nullable: true, description: 'Journal date (ISO).' })
  journal_date: string;

  @Field({ nullable: true, description: 'Bank/trust account name.' })
  account_name: string;

  @Field({
    nullable: true,
    description:
      'Human-friendly process label resolved from journal_type with dynamic placeholders substituted.',
  })
  process_label: string;

  @Field({
    nullable: true,
    description:
      'Whether this row was posted against the claim ("claim") or a payment ("payment") under the claim.',
  })
  audit_kind: string;

  @Field({
    nullable: true,
    description:
      'When audit_kind = "payment", the bigint payment_id this row was posted against.',
  })
  payment_id_ref: number;

  @Field({ nullable: true, description: 'Debit amount (string-decimal).' })
  debit_amount: string;

  @Field({ nullable: true, description: 'Credit amount (string-decimal).' })
  credit_amount: string;
}

@ObjectType({
  description:
    'Task #91 — list of PayTrade trust-ledger journal rows tied to a claim and any payments under it.',
})
export class GetClaimTrustJournalsResponse {
  @Field({ description: 'Operation status (SUCCESS / ERROR).' })
  status: string;

  @Field({ description: 'Human-readable response message.' })
  message: string;

  @Field(() => [ClaimTrustJournalRow], {
    nullable: true,
    description: 'Trust-ledger journal rows, newest first.',
  })
  data?: ClaimTrustJournalRow[];
}

@ObjectType({
  description: 'Represents a date range filter used in ledger queries.',
})
export class FilterDates {
  @Field({
    nullable: true,
    description: 'Start date of the applied date filter.',
  })
  start_date: Date;

  @Field({
    nullable: true,
    description: 'End date of the applied date filter.',
  })
  end_date: Date;
}

@ObjectType({
  description:
    'Represents an account entry within a journal, including debit and credit values.',
})
export class Account {
  @Field({
    description: 'Name of the transaction account.',
  })
  account_name: string;

  @Field({
    description: 'Description of the journal transaction for this account.',
  })
  description: string;

  @Field({
    nullable: true,
    description: 'Associated audit identifier, if applicable.',
  })
  audit_id: number | null;

  @Field({
    nullable: true,
    description: 'Debit amount recorded for the account.',
  })
  debit: string | null;

  @Field({
    nullable: true,
    description: 'Credit amount recorded for the account.',
  })
  credit: string | null;
}

@ObjectType({
  description:
    'Represents routing metadata associated with a journal transaction.',
})
export class Route {
  @Field({
    nullable: true,
    description: 'Target route or module the transaction links to.',
  })
  route_to: string;

  @Field({
    nullable: true,
    description: 'Associated payment claim identifier.',
  })
  payment_claim_id: number | null;

  @Field({
    nullable: true,
    description: 'Type of claim associated with the transaction.',
  })
  claim_type: string | null;

  @Field({
    nullable: true,
    description: 'Cash or retention classification of the transaction.',
  })
  cash_retention_type: string | null;

  @Field({
    nullable: true,
    description: 'Type of beneficiary involved in the transaction.',
  })
  beneficiary_type: string | null;

  @Field({
    nullable: true,
    description: 'Associated payment identifier.',
  })
  payment_id: number | null;

  @Field({
    nullable: true,
    description: 'Associated retention identifier.',
  })
  retention_id: number | null;

  @Field(() => [GraphQLJSONObject], {
    nullable: true,
    description:
      'List of related payment metadata objects associated with the route.',
  })
  payment_list?: Record<string, any>[];
}

@ObjectType({
  description:
    'Formatted representation of a ledger journal entry grouped by journal number.',
})
export class FormattedEntry {
  @Field({
    description: 'Formatted journal date.',
  })
  date: string;

  @Field({
    description: 'Journal number identifying the transaction.',
  })
  journal_number: number;

  @Field({
    description: 'Description provided for the journal entry.',
  })
  journal_description: string;

  @Field({
    description: 'Total debit amount for the journal.',
  })
  total_debit: string;

  @Field({
    description: 'Total credit amount for the journal.',
  })
  total_credit: string;

  @Field(() => [Account], {
    description: 'List of accounts involved in the journal entry.',
  })
  accounts: Account[];

  @Field(() => Route, {
    nullable: true,
    description: 'Routing metadata associated with the journal entry.',
  })
  route: Route;
}

@ObjectType({
  description:
    'Paginated ledger journal result with applied filters and total count.',
})
export class FetchLedgerJournalsWithTotalCount {
  @Field(() => [FormattedEntry], {
    nullable: true,
    description: 'List of formatted ledger journal entries.',
  })
  ledger_journals_list: FormattedEntry[];

  @Field({
    description: 'Total number of journal records available.',
  })
  total_count: number;

  @Field({
    nullable: true,
    description: 'Date range filters applied to the query.',
  })
  filter_dates: FilterDates;
}

@ObjectType({
  description:
    'Response wrapper for fetching ledger journals by bank account ID.',
})
export class FetchLedgerJournalsByAccountIdResponse {
  @Field({
    description: 'Operation status (e.g., SUCCESS, ERROR).',
  })
  status: string;

  @Field({
    description: 'Human-readable response message.',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Ledger journals data with pagination details.',
  })
  data: FetchLedgerJournalsWithTotalCount;
}

@ObjectType({
  description:
    'Represents a single journal transaction entry in the account ledger.',
})
export class JournalEntry {
  @Field({
    description: 'Unique identifier of the journal entry.',
  })
  id: string;

  @Field({
    description: 'System-generated journal reference number.',
  })
  journal_system_ref: number;

  @Field({
    description: 'Unique identifier of the business.',
  })
  company_id: number;

  @Field({
    nullable: true,
    description: 'Associated project identifier.',
  })
  project_id: number;

  @Field({
    nullable: true,
    description: 'Associated contract identifier.',
  })
  contract_id: number;

  @Field({
    nullable: true,
    description: 'Associated supplier identifier.',
  })
  supplier_id: number;

  @Field({
    description: 'Bank account associated with the journal entry.',
  })
  bank_account_id: number;

  @Field({
    description: 'Journal number of the transaction.',
  })
  journal_number: number;

  @Field({
    nullable: true,
    description: 'Formatted journal number string.',
  })
  journal_number_format: string;

  @Field({
    nullable: true,
    description: 'Associated audit identifier.',
  })
  audit_id: number | null;

  @Field({
    description: 'Date on which the journal entry was recorded.',
  })
  journal_date: Date;

  @Field({
    description: 'Description of the journal transaction.',
  })
  journal_description: string;

  @Field({
    description: 'Transaction account identifier.',
  })
  transaction_account_id: number;

  @Field({
    description: 'Beneficiary type related to the transaction.',
  })
  beneficiary_type: string;

  @Field({
    description: 'Name of the transaction account.',
  })
  account_name: string;

  @Field({
    nullable: true,
    description: 'Debit amount of the transaction.',
  })
  debit_amount: string;

  @Field({
    nullable: true,
    description: 'Credit amount of the transaction.',
  })
  credit_amount: string;

  @Field({
    nullable: true,
    description: 'Running balance after the transaction.',
  })
  balance_amount: string;

  @Field(() => Route, {
    nullable: true,
    description: 'Routing metadata for the journal entry.',
  })
  route: Route;
}

@ObjectType({
  description:
    'Grouped ledger entries for an account, including balances and movements.',
})
export class GridEntry {
  @Field({
    description: 'Account name for the ledger grouping.',
  })
  account_name: string;

  @Field({
    description: 'Opening balance at the beginning of the period.',
  })
  opening_balance: string;

  @Field({
    description: 'Net movement amount for the period.',
  })
  net_movement: string;

  @Field({
    nullable: true,
    description: 'Net debit movement amount.',
  })
  debit_net_movement: string;

  @Field({
    nullable: true,
    description: 'Net credit movement amount.',
  })
  credit_net_movement: string;

  @Field({
    description: 'Total debit amount for the period.',
  })
  total_debit_amount: string;

  @Field({
    description: 'Total credit amount for the period.',
  })
  total_credit_amount: string;

  @Field(() => [JournalEntry], {
    description: 'List of journal entries under this account.',
  })
  entries: JournalEntry[];
}

@ObjectType({
  description:
    'Paginated account ledger result including grid entries and beneficiaries.',
})
export class FetchAccountLedgerWithTotalCount {
  @Field(() => [GridEntry], {
    description: 'Ledger grid entries grouped by account.',
  })
  grid_entries: GridEntry[];

  @Field({
    description: 'Total number of ledger records.',
  })
  total_count: number;

  @Field(() => [GraphQLJSONObject], {
    nullable: true,
    description: 'List of beneficiaries involved in the ledger.',
  })
  beneficiary_list?: Record<string, any>[];

  @Field({
    nullable: true,
    description: 'Date range filters applied to the ledger.',
  })
  filter_dates: FilterDates;
}

@ObjectType({
  description:
    'Response wrapper for fetching account ledger by bank account ID.',
})
export class FetchAccountLedgerByAccountIdResponse {
  @Field({
    description: 'Operation status.',
  })
  status: string;

  @Field({
    description: 'Human-readable response message.',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Account ledger data with pagination.',
  })
  data: FetchAccountLedgerWithTotalCount;
}

@ObjectType({
  description: 'Represents a trial balance entry for a transaction account.',
})
export class LedgerTrialBalance {
  @Field({
    description: 'Transaction account identifier.',
  })
  transaction_account_id: number;

  @Field({
    description: 'Beneficiary type associated with the account.',
  })
  beneficiary_type: string;

  @Field({
    description: 'Name of the transaction account.',
  })
  account_name: string;

  @Field({
    description: 'Closing balance for the account.',
  })
  closing_balance: string;
}

@ObjectType({
  description: 'Trial balance response containing closing balances and totals.',
})
export class FetchLedgerTrialBalanceWithTotalCount {
  @Field(() => [LedgerTrialBalance], {
    description: 'List of trial balance entries.',
  })
  trial_balance_list: LedgerTrialBalance[];

  @Field({
    description: 'Total closing balance across all accounts.',
  })
  total_closing_balance: string;
}

@ObjectType({
  description:
    'Response wrapper for fetching ledger trial balance by bank account ID.',
})
export class FetchLedgerTrialBalanceByAccountIdResponse {
  @Field({
    description: 'Operation status.',
  })
  status: string;

  @Field({
    description: 'Human-readable response message.',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Trial balance data with totals.',
  })
  data: FetchLedgerTrialBalanceWithTotalCount;
}

@ObjectType({
  description:
    'Represents a withdrawal or deposit transaction entry for a bank account.',
})
export class FetchWithdrawAndDeposit {
  @Field({
    description: 'Unique identifier of the journal entry.',
  })
  id: string;

  @Field({
    description: 'System-generated journal reference number.',
  })
  journal_system_ref: number;

  @Field({
    description: 'Business identifier.',
  })
  company_id: number;

  @Field({
    nullable: true,
    description: 'Associated project identifier.',
  })
  project_id: number;

  @Field({
    nullable: true,
    description: 'Associated contract identifier.',
  })
  contract_id: number;

  @Field({
    nullable: true,
    description: 'Associated supplier identifier.',
  })
  supplier_id: number;

  @Field({
    description: 'Bank account identifier.',
  })
  bank_account_id: number;

  @Field({
    description: 'Journal number for the transaction.',
  })
  journal_number: string;

  @Field({
    nullable: true,
    description: 'Associated audit identifier.',
  })
  audit_id: number | null;

  @Field({
    description: 'Date of the journal transaction.',
  })
  journal_date: Date;

  @Field({
    description: 'Description of the journal entry.',
  })
  journal_description: string;

  @Field({
    description: 'Transaction account identifier.',
  })
  transaction_account_id: number;

  @Field({
    description: 'Beneficiary type involved in the transaction.',
  })
  beneficiary_type: string;

  @Field({
    description: 'Name of the transaction account.',
  })
  account_name: string;

  @Field({
    nullable: true,
    description: 'BSB number associated with the bank account.',
  })
  bsb_number: string;

  @Field({
    nullable: true,
    description: 'Bank account number.',
  })
  account_number: string;

  @Field({
    description: 'Transaction type (Deposit or Withdrawal).',
  })
  type: string;

  @Field({
    description: 'Transaction amount.',
  })
  amount: string;

  @Field({
    description: 'Balance after the transaction.',
  })
  balance_amount: string;

  @Field(() => Route, {
    nullable: true,
    description: 'Routing metadata associated with the transaction.',
  })
  route: Route;
}

@ObjectType({
  description:
    'Withdraw and deposit report including balances and applied date filters.',
})
export class FetchWithdrawAndDepositResponse {
  @Field(() => [FetchWithdrawAndDeposit], {
    description: 'List of withdrawal and deposit transactions.',
  })
  grid_entries: FetchWithdrawAndDeposit[];

  @Field({
    description: 'Opening balance at the start of the period.',
  })
  opening_balance: string;

  @Field({
    description: 'Closing balance at the end of the period.',
  })
  closing_balance: string;

  @Field({
    nullable: true,
    description: 'Opening date of the applied period.',
  })
  opening_date: Date;

  @Field({
    nullable: true,
    description: 'Closing date of the applied period.',
  })
  closing_date: Date;

  @Field({
    nullable: true,
    description: 'Date range filters applied to the report.',
  })
  filter_dates: FilterDates;
}

@ObjectType({
  description:
    'Response wrapper for fetching withdrawals and deposits by account ID.',
})
export class FetchWithdrawAndDepositByAccountIdResponse {
  @Field({
    description: 'Operation status.',
  })
  status: string;

  @Field({
    description: 'Human-readable response message.',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Withdraw and deposit report data.',
  })
  data: FetchWithdrawAndDepositResponse;
}

@ObjectType({
  description: 'Response indicating whether a specific report exists.',
})
export class CheckReportExistenceResponse {
  @Field({
    description: 'Operation status.',
  })
  status: string;

  @Field({
    description: 'Human-readable response message.',
  })
  message: string;

  @Field({
    description: 'Boolean flag indicating report existence.',
  })
  data: boolean;
}

@ObjectType({
  description: 'Key-value pair representing a statement field.',
})
export class StatementResponse {
  @Field({
    description: 'Statement field name.',
  })
  name: string;

  @Field({
    description: 'Statement field value.',
  })
  value: string;
}

@ObjectType({
  description: 'Response wrapper for checking and retrieving a bank statement.',
})
export class CheckAndGetStatementResponse {
  @Field({
    description: 'Operation status.',
  })
  status: string;

  @Field({
    description: 'Human-readable response message.',
  })
  message: string;

  @Field(() => StatementResponse, {
    nullable: true,
    description: 'Retrieved statement details, if available.',
  })
  data: StatementResponse;
}

@ObjectType({
  description:
    'Represents a bank account used for journal and ledger operations.',
})
export class GetAllBankAccountsForJournals {
  @Field({
    description: 'Unique identifier.',
  })
  id: string;

  @Field({
    description: 'Business identifier.',
  })
  company_id: number;

  @Field({
    description: 'Business name.',
  })
  company_name: string;

  @Field({
    description: 'Bank account identifier.',
  })
  bank_account_id: number;

  @Field({
    description: 'Bank account name.',
  })
  account_name: string;

  @Field({
    description: 'Type of bank account.',
  })
  account_type: BankAccountType;

  @Field({
    description: 'Current status of the bank account.',
  })
  status: BankAccountStatus;

  @Field({
    description: 'Closing balance of the bank account.',
  })
  closing_balance: string;

  @Field({
    description: 'Balance check configuration.',
  })
  balance_check: BalanceCheck;

  @Field({
    nullable: true,
    description: 'Primary administrator identifier.',
  })
  primary_admin_id: number;

  @Field({
    nullable: true,
    description: 'Primary administrator name.',
  })
  primary_admin_name: string;

  @Field({
    nullable: true,
    description: 'Primary administrator email.',
  })
  primary_admin_email: string;
}

@ObjectType({
  description: 'Paginated list of bank accounts available for journal entries.',
})
export class GetAllBankAccountsForJournalsList {
  @Field(() => [GetAllBankAccountsForJournals], {
    nullable: true,
    description: 'List of bank accounts.',
  })
  account_list: GetAllBankAccountsForJournals[];

  @Field({
    description: 'Total number of bank accounts.',
  })
  total_count: number;
}

@ObjectType({
  description: 'Response wrapper for fetching bank accounts for journal usage.',
})
export class GetAllBankAccountsForJournalsResponse {
  @Field({
    description: 'Operation status.',
  })
  status: string;

  @Field({
    description: 'Human-readable response message.',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Bank accounts list with pagination.',
  })
  data?: GetAllBankAccountsForJournalsList;
}

@ObjectType({
  description: 'Generic filter option for admin dropdowns.',
})
export class GetFiltersForAdmin {
  @Field({
    description: 'Filter display name.',
  })
  name: string;

  @Field({
    description: 'Filter value.',
  })
  value: string;
}

@ObjectType({
  description:
    'Bank account filter option available for admin-level filtering.',
})
export class GetBankAccountFiltersForAdmin {
  @Field({
    description: 'Filter display name.',
  })
  name: string;

  @Field({
    description: 'Filter value.',
  })
  value: string;

  @Field({
    nullable: true,
    description: 'Associated bank account type.',
  })
  account_type: BankAccountType;

  @Field({
    nullable: true,
    description: 'Opening date of the bank account.',
  })
  opening_date: Date;
}

@ObjectType({
  description: 'Contains available filter options for admin views.',
})
export class GetFiltersForAdminList {
  @Field(() => [GetFiltersForAdmin], {
    nullable: true,
    description: 'List of companies available for filtering.',
  })
  company_list: GetFiltersForAdmin[];

  @Field(() => [GetBankAccountFiltersForAdmin], {
    nullable: true,
    description: 'List of bank accounts available for filtering.',
  })
  account_list: GetBankAccountFiltersForAdmin[];

  @Field(() => [GetFiltersForAdmin], {
    nullable: true,
    description: 'List of available bank account types.',
  })
  account_type_list: GetFiltersForAdmin[];
}

@ObjectType({
  description: 'Response wrapper for admin filter options.',
})
export class GetFiltersForAdminResponse {
  @Field({ description: 'Operation status.' })
  status: string;

  @Field({ description: 'Human-readable response message.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Filter data available for admin use.',
  })
  data?: GetFiltersForAdminList;
}

@ObjectType({
  description: 'Represents trust accounting balance values.',
})
export class GetTrustAccountingBalance {
  @Field({
    nullable: true,
    description: 'Raw deposit and withdrawal balance (numeric).',
  })
  unformatted_deposit_and_withdrawal_balance: number;

  @Field({
    nullable: true,
    description: 'Raw account ledger balance (numeric).',
  })
  unformatted_account_ledger_balance: number;

  @Field({
    nullable: true,
    description: 'Formatted deposit and withdrawal balance.',
  })
  formatted_deposit_and_withdrawal_balance: string;

  @Field({
    nullable: true,
    description: 'Formatted account ledger balance.',
  })
  formatted_account_ledger_balance: string;
}

@ObjectType({
  description: 'Response wrapper for trust accounting balance.',
})
export class GetTrustAccountingBalanceResponse {
  @Field({ description: 'Operation status.' })
  status: string;

  @Field({ description: 'Human-readable response message.' })
  message: string;

  @Field(() => GetTrustAccountingBalance, {
    nullable: true,
    description: 'Trust accounting balance details.',
  })
  data: GetTrustAccountingBalance;
}

@ObjectType({
  description: 'Basic reconciliation report reference.',
})
export class ReconciliationReport {
  @Field({ description: 'Unique reconciliation report identifier.' })
  id: string;

  @Field({ description: 'Associated business identifier.' })
  company_id: number;

  @Field({ description: 'System-generated report number.' })
  report_id: number;

  @Field({ description: 'Current status of the report.' })
  report_status: ReportStatus;
}

@ObjectType({
  description: 'Response wrapper for reconciliation report creation.',
})
export class ReconciliationReportResponse {
  @Field({ description: 'Operation status.' })
  status: string;

  @Field({ description: 'Human-readable response message.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Reconciliation report details.',
  })
  data?: ReconciliationReport;
}

@ObjectType({
  description: 'Detailed view of a reconciliation report.',
})
export class ViewReconciliationReport {
  @Field({ description: 'Unique report identifier.' })
  id: string;

  @Field({ description: 'System-generated report number.' })
  report_id: number;

  @Field({ description: 'Associated business identifier.' })
  company_id: number;

  @Field({ description: 'Month-end date for reconciliation.' })
  month_end_date: Date;

  @Field({ description: 'Associated bank account identifier.' })
  bank_account_id: number;

  @Field({
    nullable: true,
    description: 'Name of the bank account.',
  })
  account_name: string;

  @Field({ description: 'Bank statement closing balance.' })
  bank_statement_balance: string;

  @Field({ description: 'Adjustment amount applied.' })
  adjustments: string;

  @Field({
    nullable: true,
    description: 'Comments related to adjustments.',
  })
  adjustment_comment: string;

  @Field({ description: 'Expected balance after reconciliation.' })
  expected_balance: string;

  @Field({ description: 'Deposit and withdrawal balance.' })
  deposit_withdrawal_balance: string;

  @Field({ description: 'Account ledger balance.' })
  account_ledger_balance: string;

  @Field({ description: 'Reconciliation status.' })
  reconcile_status: ReconcileStatus;

  @Field({ description: 'Overall report status.' })
  report_status: ReportStatus;

  @Field({
    nullable: true,
    description: 'Date the report was finalized.',
  })
  report_date: Date;
}

@ObjectType({
  description: 'Response wrapper for viewing reconciliation reports.',
})
export class ViewReconciliationReportResponse {
  @Field({ description: 'Operation status.' })
  status: string;

  @Field({ description: 'Human-readable response message.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Reconciliation report details.',
  })
  data?: ViewReconciliationReport;
}

@ObjectType({
  description:
    'Contains a list of reconciliation reports along with the total count.',
})
export class GetAllReconciliationReportList {
  @Field(() => [ViewReconciliationReport], {
    nullable: true,
    description: 'Array of reconciliation report details.',
  })
  report_list: ViewReconciliationReport[];

  @Field({ description: 'Total number of reconciliation reports available.' })
  total_count: number;
}

@ObjectType({
  description: 'Response wrapper for fetching all reconciliation reports.',
})
export class GetAllReconciliationReportListResponse {
  @Field({ description: 'Operation status (e.g., SUCCESS, ERROR).' })
  status: string;

  @Field({ description: 'Human-readable message describing the response.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing the list of reconciliation reports.',
  })
  data?: GetAllReconciliationReportList;
}

@ObjectType({
  description: 'Represents the result of checking a nil return for an audit.',
})
export class NilReturnForAudit {
  @Field({ description: 'Indicates if a warning should be shown.' })
  warning: boolean;

  @Field({ description: 'Message describing the nil return status.' })
  message: string;
}

@ObjectType({
  description: 'Response wrapper for checking nil return status for an audit.',
})
export class CheckNilReturnForAuditResponse {
  @Field({ description: 'Operation status.' })
  status: string;

  @Field({ description: 'Human-readable response message.' })
  message: string;

  @Field(() => NilReturnForAudit, {
    nullable: true,
    description: 'Details about the nil return check.',
  })
  data: NilReturnForAudit;
}

@ObjectType({
  description: 'Represents an audit report with optional details.',
})
export class AuditReport {
  @Field({
    nullable: true,
    description: 'Unique identifier of the audit report.',
  })
  id: string;

  @Field({ nullable: true, description: 'Associated business identifier.' })
  company_id: number;

  @Field({
    nullable: true,
    description: 'Associated project identifier, if applicable.',
  })
  project_id: number;

  @Field({ nullable: true, description: 'Audit identifier.' })
  audit_id: number;

  @Field({ nullable: true, description: 'Associated bank account identifier.' })
  bank_account_id: number;

  @Field({ nullable: true, description: 'Nil return status for the audit.' })
  nil_return: string;

  @Field({
    nullable: true,
    description: 'Indicates if a warning should be shown.',
  })
  warning: boolean;

  @Field({
    nullable: true,
    description: 'Additional message or note regarding the audit report.',
  })
  message: string;
}

@ObjectType({
  description: 'Response wrapper for fetching an audit report.',
})
export class AuditReportResponse {
  @Field({ description: 'Operation status.' })
  status: string;

  @Field({ description: 'Human-readable message describing the response.' })
  message: string;

  @Field({ nullable: true, description: 'Audit report data.' })
  data?: AuditReport;
}

@ObjectType({
  description: 'Contains the start date of an audit for a bank account.',
})
export class AuditStartDateDetails {
  @Field({ description: 'Bank account identifier associated with the audit.' })
  bank_account_id: number;

  @Field({ nullable: true, description: 'Start date of the audit period.' })
  start_audit_date: Date;
}

@ObjectType({
  description: 'Response wrapper for fetching audit start date details.',
})
export class AuditStartDateResponse {
  @Field({ description: 'Operation status.' })
  status: string;

  @Field({ description: 'Human-readable message describing the response.' })
  message: string;

  @Field({ nullable: true, description: 'Audit start date details.' })
  data?: AuditStartDateDetails;
}

@ObjectType({
  description: 'Represents a detailed audit report.',
})
export class ViewAuditReport {
  @Field({ description: 'Unique audit report identifier.' })
  id: string;

  @Field({ description: 'Associated business identifier.' })
  company_id: number;

  @Field({
    nullable: true,
    description: 'Associated project identifier.',
  })
  project_id: number;

  @Field({ description: 'Audit identifier.' })
  audit_id: number;

  @Field({ description: 'Audit date.' })
  audit_date: Date;

  @Field({
    nullable: true,
    description: 'Minimum audit start date.',
  })
  min_aud_from_date: Date;

  @Field({
    nullable: true,
    description: 'Audit generation start date.',
  })
  aud_gen_from_date: Date;

  @Field({
    nullable: true,
    description: 'Audit generation end date.',
  })
  aud_gen_to_date: Date;

  @Field({ description: 'Associated bank account identifier.' })
  bank_account_id: number;

  @Field({ description: 'Type of bank account.' })
  account_type: string;

  @Field({ description: 'Name of the bank account.' })
  account_name: string;

  @Field(() => [String], {
    nullable: true,
    description: 'List of associated attachment identifiers.',
  })
  attachment_ids: string[];

  @Field({ description: 'Nil return status.' })
  nil_return: NilReturnStatus;

  @Field(() => [GetFileRes], {
    nullable: true,
    description: 'Attached file metadata.',
  })
  file_details?: GetFileRes[];

  @Field({
    nullable: true,
    description: 'Date the audit report was finalized.',
  })
  report_date: Date;

  @Field({
    nullable: true,
    description: 'Associated bank statement identifier.',
  })
  statement_id: number;
}

@ObjectType({
  description: 'Response wrapper for viewing audit reports.',
})
export class ViewAuditReportResponse {
  @Field({ description: 'Operation status.' })
  status: string;

  @Field({ description: 'Human-readable response message.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Audit report details.',
  })
  data?: ViewAuditReport;
}

@ObjectType({
  description: 'Contains a list of audit reports along with the total count.',
})
export class GetAllAuditReportList {
  @Field(() => [ViewAuditReport], {
    nullable: true,
    description: 'Array of audit report details.',
  })
  report_list: ViewAuditReport[];

  @Field({
    description: 'Total number of audit reports available.',
  })
  total_count: number;
}

@ObjectType({
  description: 'Response wrapper for fetching all audit reports.',
})
export class GetAllAuditReportListResponse {
  @Field({
    description: 'Operation status (e.g., SUCCESS, ERROR).',
  })
  status: string;

  @Field({
    description: 'Human-readable message describing the response.',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing the list of audit reports.',
  })
  data?: GetAllAuditReportList;
}

@ObjectType({
  description: 'Represents audit return validation status.',
})
export class AuditReturnForAudit {
  @Field({ description: 'Indicates whether a warning exists.' })
  warning: boolean;

  @Field({ description: 'Warning or informational message.' })
  message: string;
}

@ObjectType({
  description: 'Response wrapper for audit return validation.',
})
export class CheckAuditReturnForAuditResponse {
  @Field({ description: 'Operation status.' })
  status: string;

  @Field({ description: 'Human-readable response message.' })
  message: string;

  @Field(() => AuditReturnForAudit, {
    nullable: true,
    description: 'Audit return validation result.',
  })
  data: AuditReturnForAudit;
}
