export interface AuditReportType {
  audit_date: string;
  account_name: string;
  audit_id: number;
  bank_account_id: number;
  company_id: number;
  id: string;
  nil_return: string;
  report_date: string;
  statement_id: number;
}

export interface ReconciliationReportType {
  account_ledger_balance: string;
  account_name: string;
  adjustment_comment: string;
  adjustments: string;
  bank_account_id: string;
  bank_statement_balance: string;
  company_id: string;
  deposit_withdrawal_balance: string;
  expected_balance: string;
  id: string;
  month_end_date: string;
  reconcile_status: string;
  report_date: string;
  report_id: string;
  report_status: string;
}
