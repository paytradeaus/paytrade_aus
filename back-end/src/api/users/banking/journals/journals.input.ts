import { InputType, Field, PartialType } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import { Group } from 'src/entities/user-details.entity';
import {
  BalanceCheck,
  BankAccountStatus,
  BankAccountType,
  NilReturnStatus,
  ReconcileStatus,
} from 'src/libs/@paytrade-types/paytrade-types';

@InputType({
  description: 'Input payload for creating a new journal entry in the ledger.',
})
export class AddJournalInput {
  @Field({ description: 'Unique identifier of the business.' })
  company_id: number;

  @Field({ description: 'Unique identifier of the project.' })
  project_id: number;

  @Field({ description: 'Unique identifier of the contract.' })
  contract_id: number;

  @Field({ description: 'Unique identifier of the supplier.' })
  supplier_id: number;

  @Field({ description: 'Unique identifier of the associated bank account.' })
  bank_account_id: number;

  @Field({ description: 'Sequential journal number.' })
  journal_number: number;

  @Field({ description: 'Audit reference ID associated with the journal.' })
  audit_id: number;

  @Field({ description: 'Suffix used to uniquely identify the journal.' })
  journal_suffix: string;

  @Field({
    description: 'Suffix used to identify the journal activity type.',
  })
  activity_suffix: string;

  @Field({ description: 'Date on which the journal entry is recorded.' })
  journal_date: Date;

  @Field({
    nullable: true,
    description: 'Optional description or narration for the journal entry.',
  })
  journal_description: string;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Dynamic key-value data associated with the journal entry.',
  })
  dynamic_values?: Record<string, any>;

  @Field({
    description: 'Ledger transaction account identifier.',
  })
  transaction_account_id: number;

  @Field({
    nullable: true,
    description: 'Debit amount recorded in the journal entry.',
  })
  debit_amount: number;

  @Field({
    nullable: true,
    description: 'Credit amount recorded in the journal entry.',
  })
  credit_amount: number;

  @Field({
    nullable: true,
    description: 'Resulting balance after the journal entry.',
  })
  balance_amount: number;

  @Field({
    description: 'Identifier indicating the journal processing workflow.',
  })
  journal_process_id: number;

  @Field({
    description: 'Type of journal entry (e.g., DEBIT, CREDIT, ADJUSTMENT).',
  })
  entry_type: string;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the journal entry was created.',
  })
  created_on: Date;

  @Field({
    nullable: true,
    description: 'User ID of the logged-in user who created the journal.',
  })
  created_by: number;
}

@InputType({
  description: 'Input payload for fetching ledger journals by bank account ID.',
})
export class FetchLedgerJournalsByAccountIdInput {
  @Field({
    description: 'Unique identifier of the bank account.',
  })
  bank_account_id: number;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Page number for pagination.',
  })
  page_number?: number;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Number of records per page.',
  })
  page_size?: number;

  @Field({
    nullable: true,
    description: 'Predefined date filter (e.g., "This month", "Last month").',
  })
  date_filter: string;

  @Field({
    nullable: true,
    description: 'Start date for filtering journal entries.',
  })
  start_date: Date;

  @Field({
    nullable: true,
    description: 'End date for filtering journal entries.',
  })
  end_date: Date;

  @Field({
    nullable: true,
    description: 'Timezone used for date-based filtering.',
  })
  timezone: string;

  @Field({
    nullable: true,
    description: 'Search keyword for filtering journal records.',
  })
  search: string;

  @Field({
    nullable: true,
    description: 'Global search keyword across all searchable fields.',
  })
  global_search: string;
}

@InputType({
  description:
    'Input payload for fetching account ledger entries by bank account ID.',
})
export class FetchAccountLedgerByAccountIdInput {
  @Field({
    description: 'Unique identifier of the bank account.',
  })
  bank_account_id: number;

  @Field({
    nullable: true,
    description: 'Type of beneficiary associated with the ledger entry.',
  })
  beneficiary_type: string;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Page number for pagination.',
  })
  page_number?: number;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Number of records per page.',
  })
  page_size?: number;

  @Field({
    nullable: true,
    description: 'Predefined date filter (e.g., "This month", "Last month").',
  })
  date_filter: string;

  @Field({
    nullable: true,
    description: 'Start date for ledger filtering.',
  })
  start_date: Date;

  @Field({
    nullable: true,
    description: 'End date for ledger filtering.',
  })
  end_date: Date;

  @Field({
    nullable: true,
    description: 'Timezone used for date-based filtering.',
  })
  timezone: string;

  @Field({
    nullable: true,
    description: 'Search keyword for ledger records.',
  })
  search: string;

  @Field({
    nullable: true,
    description: 'Beneficiary name used for filtering ledger entries.',
  })
  beneficiary: string;
}

@InputType({
  description:
    'Input payload for fetching trial balance of a ledger by account ID.',
})
export class FetchLedgerTrialBalanceByAccountIdInput {
  @Field({
    description: 'Unique identifier of the bank account.',
  })
  bank_account_id: number;

  @Field({
    description: 'Start date for trial balance calculation.',
  })
  start_date: Date;

  @Field({
    description: 'Timezone used for trial balance calculation.',
  })
  timezone: string;
}

@InputType({
  description:
    'Input payload for fetching deposits and withdrawals by bank account ID.',
})
export class FetchDepositsAndWithdrawalsByAccountIdInput {
  @Field({
    description: 'Unique identifier of the bank account.',
  })
  bank_account_id: number;

  @Field({
    nullable: true,
    description: 'Predefined date filter (e.g., "This month", "Last month").',
  })
  date_filter: string;

  @Field({
    nullable: true,
    description: 'Start date for filtering transactions.',
  })
  start_date: Date;

  @Field({
    nullable: true,
    description: 'End date for filtering transactions.',
  })
  end_date: Date;

  @Field({
    nullable: true,
    description: 'Timezone used for date-based filtering.',
  })
  timezone: string;

  @Field({
    nullable: true,
    description: 'Search keyword for deposits and withdrawals.',
  })
  search: string;
}

@InputType({
  description:
    'Input payload for checking the existence of a generated report for an account.',
})
export class CheckReportExistenceByAccountIdInput {
  @Field({
    description: 'Unique identifier of the bank account.',
  })
  bank_account_id: number;

  @Field({
    nullable: true,
    description: 'Optional project identifier associated with the report.',
  })
  project_id?: number;

  @Field({
    description: 'Month-end date used to identify the report.',
  })
  month_end_date: Date;

  @Field({
    description: 'Timezone used for report date evaluation.',
  })
  timezone: string;
}

@InputType({
  description:
    'Input payload for fetching bank accounts available for journal entries.',
})
export class GetAllBankAccountsForJournalsInput {
  @Field({
    nullable: true,
    description: 'Unique identifier of the business.',
  })
  company_id: number;

  @Field({
    nullable: true,
    description: 'Specific bank account ID to filter results.',
  })
  bank_account_id: number;

  @Field({
    nullable: true,
    description: 'Type of bank account (e.g., TRUST, OPERATING).',
  })
  account_type: BankAccountType;

  @Field({
    nullable: true,
    description: 'Current status of the bank account.',
  })
  status: BankAccountStatus;

  @Field({
    nullable: true,
    description: 'Balance validation condition applied to the bank accounts.',
  })
  balance_check: BalanceCheck;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Page number for pagination.',
  })
  page_number?: number;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Number of records per page.',
  })
  page_size?: number;

  @Field({
    nullable: true,
    description: 'Field name used for sorting results.',
  })
  sorting_field?: string;

  @Field({
    nullable: true,
    description: 'Sorting order: ASC for ascending or DESC for descending.',
  })
  sorting_order?: 'ASC' | 'DESC';
}

@InputType({
  description:
    'Input payload for fetching trust accounting balance for a bank account.',
})
export class GetTrustAccountingBalanceInput {
  @Field({
    description: 'Unique identifier of the bank account.',
  })
  bank_account_id: number;

  @Field({
    description: 'Month-end date for which the balance is calculated.',
  })
  month_end_date: Date;

  @Field({
    description: 'Timezone used for balance calculation.',
  })
  timezone: string;
}

@InputType({
  description: 'Input payload for creating a new bank reconciliation report.',
})
export class AddReconciliationReportInput {
  @Field({
    description: 'Unique identifier of the business.',
  })
  company_id: number;

  @Field({
    description: 'Month-end date for the reconciliation report.',
  })
  month_end_date: Date;

  @Field({
    description: 'Unique identifier of the bank account.',
  })
  bank_account_id: number;

  @Field({
    description: 'Closing balance as per the bank statement.',
  })
  bank_statement_balance: number;

  @Field({
    nullable: true,
    description: 'Adjustment amount applied during reconciliation.',
  })
  adjustments: number;

  @Field({
    nullable: true,
    description: 'Explanation or notes for reconciliation adjustments.',
  })
  adjustment_comment: string;

  @Field({
    description: 'Expected balance after reconciliation.',
  })
  expected_balance: number;

  @Field({
    description: 'Total deposits and withdrawals balance.',
  })
  deposit_withdrawal_balance: number;

  @Field({
    description: 'Ledger balance calculated from account journals.',
  })
  account_ledger_balance: number;

  @Field({
    description: 'Current reconciliation status.',
  })
  reconcile_status: ReconcileStatus;

  @Field({
    nullable: true,
    description: 'User ID of the logged-in user who created the report.',
  })
  created_by: number;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the report was created.',
  })
  created_on: Date;

  @Field({
    nullable: true,
    description:
      'Group (User, Admin, System) under which the report was created.',
  })
  created_group: Group;
}

@InputType({
  description:
    'Input payload for editing an existing bank reconciliation report.',
})
export class EditReconciliationReportInput extends PartialType(
  AddReconciliationReportInput,
) {
  @Field({
    description: 'Unique identifier of the reconciliation report.',
  })
  id: string;

  @Field({
    nullable: true,
    description: 'User ID of the logged-in user who updated the report.',
  })
  updated_by: number;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the report was updated.',
  })
  updated_on: Date;

  @Field({
    nullable: true,
    description:
      'Group (User, Admin, System) under which the report was updated.',
  })
  updated_group: Group;
}

@InputType({
  description:
    'Input payload for fetching reconciliation reports with filters.',
})
export class GetAllReconciliationReportInput {
  @Field({
    description: 'Unique identifier of the business.',
  })
  company_id: number;

  @Field({
    nullable: true,
    description: 'Filter by specific bank account ID.',
  })
  bank_account_id: number;

  @Field({
    nullable: true,
    description: 'Type of bank account.',
  })
  account_type: BankAccountType;

  @Field({
    nullable: true,
    description: 'Indicates whether archived reports should be included.',
  })
  isArchived: boolean;

  @Field({
    nullable: true,
    description: 'Predefined date filter (e.g., "This month", "Last month").',
  })
  date_filter: string;

  @Field({
    nullable: true,
    description: 'Start date for reconciliation report filtering.',
  })
  start_date: Date;

  @Field({
    nullable: true,
    description: 'End date for reconciliation report filtering.',
  })
  end_date: Date;

  @Field({
    nullable: true,
    description: 'Timezone used for date-based filtering.',
  })
  timezone: string;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Page number for pagination.',
  })
  page_number?: number;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Number of records per page.',
  })
  page_size?: number;

  @Field({
    nullable: true,
    description: 'Field used for sorting the reports.',
  })
  sorting_field?: string;

  @Field({
    nullable: true,
    description: 'Sorting order: ASC or DESC.',
  })
  sorting_order?: 'ASC' | 'DESC';
}

@InputType({
  description:
    'Input payload for checking whether a nil return applies for an audit.',
})
export class CheckNilReturnForAuditInput {
  @Field({
    description: 'Unique identifier of the bank account.',
  })
  bank_account_id: number;

  @Field({
    description: 'Financial year-end date for the audit.',
  })
  year_end_date: Date;

  @Field({
    description: 'Timezone used for audit evaluation.',
  })
  timezone: string;
}

@InputType({
  description: 'Input payload for creating a new audit report.',
})
export class AddAuditReportInput {
  @Field({
    description: 'Unique identifier of the business.',
  })
  company_id: number;

  @Field({
    description: 'Date on which the audit was conducted.',
  })
  audit_date: Date;

  @Field({
    nullable: true,
    description: 'Minimum audit coverage start date.',
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

  @Field({
    description: 'Unique identifier of the bank account.',
  })
  bank_account_id: number;

  @Field({
    nullable: true,
    description: 'Associated project ID, if applicable.',
  })
  project_id?: number;

  @Field({
    description: 'Indicates whether the audit is a nil return.',
  })
  nil_return: NilReturnStatus;

  @Field({
    nullable: true,
    description: 'Attachment ID for the audit report document.',
  })
  attachment_id: string;

  @Field({
    nullable: true,
    description: 'User ID of the logged-in user who created the audit report.',
  })
  created_by: number;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the audit report was created.',
  })
  created_on: Date;

  @Field({
    nullable: true,
    description:
      'Group (User, Admin, System) under which the audit report was created.',
  })
  created_group: Group;
}

@InputType({
  description: 'Input payload for editing an existing audit report.',
})
export class EditAuditReportInput extends PartialType(AddAuditReportInput) {
  @Field({
    description: 'Unique identifier of the audit report.',
  })
  id: string;

  @Field(() => [String], {
    nullable: true,
    description: 'List of newly added attachment IDs.',
  })
  new_attachment_ids?: string[];

  @Field(() => [String], {
    nullable: true,
    description: 'List of attachment IDs to be removed.',
  })
  removed_attachment_ids?: string[];

  @Field({
    nullable: true,
    description: 'User ID of the logged-in user who updated the audit report.',
  })
  updated_by: number;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the audit report was updated.',
  })
  updated_on: Date;

  @Field({
    nullable: true,
    description:
      'Group (User, Admin, System) under which the audit report was updated.',
  })
  updated_group: Group;
}

@InputType({
  description: 'Input payload for deleting an audit report and its files.',
})
export class DeleteAuditReportInput {
  @Field({
    description: 'Unique identifier of the audit report to delete.',
  })
  id: string;

  @Field({
    description:
      'Company identifier the audit report must belong to (ownership guard).',
  })
  company_id: number;
}

@InputType({
  description:
    'Input payload for fetching audit reports with filters and pagination.',
})
export class GetAllAuditReportInput {
  @Field({
    description: 'Unique identifier of the business.',
  })
  company_id: number;

  @Field({
    nullable: true,
    description: 'Filter by specific bank account ID.',
  })
  bank_account_id: number;

  @Field({
    nullable: true,
    description: 'Type of bank account.',
  })
  account_type: BankAccountType;

  @Field({
    nullable: true,
    description: 'Predefined date filter (e.g., "This month", "Last month").',
  })
  date_filter: string;

  @Field({
    nullable: true,
    description: 'Start date for audit report filtering.',
  })
  start_date: Date;

  @Field({
    nullable: true,
    description: 'End date for audit report filtering.',
  })
  end_date: Date;

  @Field({
    nullable: true,
    description: 'Timezone used for date-based filtering.',
  })
  timezone: string;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Page number for pagination.',
  })
  page_number?: number;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Number of records per page.',
  })
  page_size?: number;

  @Field({
    nullable: true,
    description: 'Field used for sorting audit reports.',
  })
  sorting_field?: string;

  @Field({
    nullable: true,
    description: 'Sorting order: ASC or DESC.',
  })
  sorting_order?: 'ASC' | 'DESC';
}
