const auditListHeaders = [
  { dataKey: "audit_date", title: "Date" },
  { dataKey: "account_name", title: "Bank Account Name" },
  { dataKey: "bank_statement_modified", title: "Bank Statement" },
  { dataKey: "ledger_journals_modified", title: "Ledger Journals" },
  { dataKey: "ledger_modified", title: "Ledger" },
  { dataKey: "trail_balance_modified", title: "Trial Balance Statement" },
  {
    dataKey: "deposit_withdraw_modified",
    title: "Record of Deposit and Withdrawls",
  },
  {
    dataKey: "reconciliation_modified",
    title: "Reconciliation Record",
  },
  {
    dataKey: "audit_report_modified",
    title: "Audit Report",
  },
  { title: "Actions", dataKey: "status", restrictSorting: true },
];

const journalsexcelColumnNames = [
  { value: "date", label: "" },
  { value: "account_name", label: "Account" },
  { value: "audit_id", label: "Audit Id" },
  { value: "debit", label: "Debit" },
  { value: "credit", label: "Credit" },
];
const ledgerexcelColumnNames = [
  { value: "journal_date", label: "Date" },
  { value: "journal_description", label: "Transaction" },
  { value: "journal_number", label: "Reference" },
  { value: "debit_amount", label: "Debit" },
  { value: "credit_amount", label: "Credit" },
  { value: "balance_amount", label: "Balance" },
];

const journalsListHeaders = [
  { dataKey: "date", emptyHeader: true },
  { dataKey: "account_name", headerName: "Account", elongatedHeader: true },
  { dataKey: "debit", headerName: "Debit" },
  { dataKey: "credit", headerName: "Credit" },
];

const trustListHeaders = [
  { dataKey: "date" },
  { dataKey: "account_name", headerName: "Account", elongatedHeader: true },
  { dataKey: "audit_id", headerName: "Audit Id" },
  { dataKey: "debit", headerName: "Debit" },
  { dataKey: "credit", headerName: "Credit" },
];

const ledgerListHeaders = [
  { dataKey: "journal_date", headerName: "Date" },
  {
    dataKey: "journal_description",
    headerName: "Transaction",
    elongatedHeader: true,
  },
  { dataKey: "journal_number_format", headerName: "Reference" },
  { dataKey: "debit_amount", headerName: "Debit" },
  { dataKey: "credit_amount", headerName: "Credit" },
  { dataKey: "balance_amount", headerName: "Balance", isRightAlign: true },
];

const depositsListHeaders = [
  { dataKey: "journal_date", headerName: "Date" },
  {
    dataKey: "type",
    headerName: "Type",
    elongatedHeader: true,
  },
  { dataKey: "journal_description", headerName: "Transaction" },
  { dataKey: "account_name", headerName: "Account Name" },
  { dataKey: "account_number", headerName: "Account Number" },
  { dataKey: "bsb_number", headerName: "Bsb Number" },
  { dataKey: "journal_number", headerName: "Reference" },
  { dataKey: "amount", headerName: "Amount" },
  { dataKey: "balance_amount", headerName: "Balance", isRightAlign: true },
];

const trialListHeaders = [
  { dataKey: "account_name", headerName: "Account" },
  {
    dataKey: "closing_balance",
    headerName: "Closing Balance",
    elongatedHeader: true,
    isRightAlign: true,
  },
];
const auditRenderData = [
  { key: "audit_date" },
  { key: "account_name" },
  { key: "bank_statement_modified", returnOnClickTableData: true },
  { key: "ledger_journals_modified", returnOnClickTableData: true },
  { key: "ledger_modified", returnOnClickTableData: true },
  { key: "trail_balance_modified", returnOnClickTableData: true },
  { key: "deposit_withdraw_modified", returnOnClickTableData: true },
  { key: "reconciliation_modified", returnOnClickTableData: true },
  { key: "audit_report_modified", returnOnClickTableData: true },
];

const reconciliationListHeaders = [
  { dataKey: "report_date", title: "created" },
  { dataKey: "month_end_date", title: "Month end" },
  { dataKey: "account_name", title: "Bank Account Name" },
  { dataKey: "bank_statement_balance", title: "Bank Statement Balance" },
  { dataKey: "adjustments", title: "Adjustments" },
  { dataKey: "adjustment_comment", title: "Adjustment Comments" },
  { dataKey: "expected_balance", title: "Expected Balance" },
  {
    dataKey: "deposit_withdrawal_balance",
    title: "Record of Deposit and Withdrawals Balance",
  },

  {
    dataKey: "account_ledger_balance",
    title: "Trust Account Ledger Balance",
  },
  {
    dataKey: "reconcile_status",
    title: "Reconcile Status",
  },
  { title: "Actions", dataKey: "status", restrictSorting: true },
];

const reconciliationRenderData = [
  { key: "report_date", typeOfDate: true },
  { key: "month_end_date", typeOfDate: true },
  { key: "account_name" },
  { key: "bank_statement_balance" },
  { key: "adjustments" },
  { key: "adjustment_comment" },
  { key: "expected_balance" },
  { key: "deposit_withdrawal_balance" },
  { key: "account_ledger_balance" },
  { key: "reconcile_status" },
];

const reconciliationPdfDataRow = [
  "month_end_date",
  "account_name",
  "bank_statement_balance",
  "adjustments",
  "adjustment_comment",
  "expected_balance",
  "deposit_withdrawal_balance",
  "account_ledger_balance",
  "reconcile_status",
];

const reconciliationListPDFHeaders = [
  "Date",
  "Bank Account Name",
  "Bank Statement Balance",
  "Adjustments",
  "Adjustment Comments",
  "Expected Balance",
  "Record of Deposit and Withdrawals Balance",
  "Trust Account Ledger Balance",
  "Reconcile Status",
];
const trustAccountingTabs = [
  { id: "Journals", label: "Journals", hasError: false },
  { id: "Account Ledger", label: "Account Ledger", hasError: true },

  {
    id: "Trial Balance Statement",
    label: "Trial Balance Statement",
    hasError: true,
  },
  {
    id: "Deposits and Withdrawals Report",
    label: "Deposits and Withdrawals Report",
    hasError: true,
  },
  {
    id: "Reconciliation Record",
    label: "Reconciliation Record",
    hasError: true,
  },
  { id: "Audit", label: "Audit", hasError: true },
];

const reconciliationExcelColumnNames = [
  { value: "month_end_date", label: "Date" },
  { value: "account_name", label: "Bank Account Name" },
  { value: "bank_statement_balance", label: "Bank Statement Balance" },
  { value: "adjustments", label: "Adjustments" },
  { value: "adjustment_comment", label: "Adjustment Comments" },
  { value: "expected_balance", label: "Expected Balance" },
  {
    value: "deposit_withdrawal_balance",
    label: "Record of Deposit and Withdrawals Balance",
  },
  {
    value: "account_ledger_balance",
    label: "Trust Account Ledger Balance",
  },
  { value: "reconcile_status", label: "Reconcile Status" },
];

const journalRenderRowData = [
  {
    key: "date",
    displayFirstRowKey: true,
    renderFromGridObj: true,
    boldFont: false,
    formatDate: true,
    width: "10em",
  },
  { key: "account_name", footerKey: "journal_description", width: "60em" },
  { key: "audit_id", dynamicRowRendering: true, width: "10em" },
  { key: "credit", footerKey: "total_credit", width: "10em" },
  { key: "debit", footerKey: "total_debit", width: "10em" },
];

const trialRenderRowData = [
  {
    key: "account_name",
    renderStaticData: true,
    staticFooterKey: "Balance",
  },
  {
    key: "closing_balance",
    footerKey: "total_closing_balance",
    isRightAlign: true,
  },
];

const ledgerRenderRowData = [
  {
    headerKey: "account_name",
    formatDate: true,
    key: "journal_date",
    width: "15%",
  },
  {
    key: "journal_description",
    footerKey: "account_name",
    renderStaticData: true,
    netMovementKey: "Closing Balance",
    resCombinedStaticFooterKey: "Total",
    width: "40%",
    staticHeaderKey: "Opening Balance",
  },
  {
    key: "journal_number_format",
    footerKey: "",
    isCenterAligned: "center",
    width: "5%",
  },
  {
    key: "debit_amount",
    footerKey: "total_debit_amount",
    netMovementKey: "debit_net_movement",
    width: "5%",
  },
  {
    key: "credit_amount",
    footerKey: "total_credit_amount",
    netMovementKey: "credit_net_movement",
    width: "5%",
  },
  {
    key: "balance_amount",
    headerKey: "opening_balance",
    boldFont: true,
    width: "5%",
    isRightAlign: true,
  },
];
const depositsRenderRowData = [
  {
    headerKey: "opening_date",
    footerKey: "closing_date",
    formatDate: true,
    key: "journal_date",
  },
  { key: "type" },
  {
    key: "journal_description",
    renderStaticData: true,
    staticFooterKey: "Closing Balance",
    staticHeaderKey: "Opening Balance",
  },
  {
    key: "account_name",
  },
  {
    key: "account_number",
  },
  {
    key: "bsb_number",
  },
  { key: "journal_number", footerKey: "" },
  { key: "amount", footerKey: "" },
  {
    key: "balance_amount",
    headerKey: "opening_balance",
    footerKey: "closing_balance",
    boldFont: true,
    isRightAlign: true,
  },
];

const returnOptions = [
  { value: "Yes", label: "Yes" },
  { value: "NA", label: "NA" },
];

export {
  trustAccountingTabs,
  journalsListHeaders,
  ledgerListHeaders,
  journalRenderRowData,
  ledgerRenderRowData,
  auditRenderData,
  auditListHeaders,
  depositsRenderRowData,
  reconciliationPdfDataRow,
  reconciliationExcelColumnNames,
  reconciliationRenderData,
  reconciliationListHeaders,
  reconciliationListPDFHeaders,
  trustListHeaders,
  trialListHeaders,
  trialRenderRowData,
  depositsListHeaders,
  returnOptions,
  journalsexcelColumnNames,
  ledgerexcelColumnNames,
};
