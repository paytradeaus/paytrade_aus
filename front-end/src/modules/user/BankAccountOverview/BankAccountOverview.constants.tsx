const transactionsTabOptions = [
  {
    value: "To Review",
    label: "For Review",
  },
  {
    value: "Matched",
    label: "Matched",
  },
  {
    value: "Excluded",
    label: "Excluded",
  },
  { value: "All", label: "All" },
];

const bankOverviewTabOptions = [
  { id: "Transactions", label: "Transactions" },
  { id: "bank-statements", label: "Bank Statements" },
  {
    id: "Interest and Charges",
    label: "Interest and Charges",
  },
  { id: "To Do", label: "To Do" },
  { id: "Journals", label: "Journals" },
];

const transactionsHeader = [
  { title: "Date" },
  { title: "Description" },
  { title: "Spent" },
  { title: "Received" },
  { title: "Matched to" },
  { title: "Payment id" },
  { title: "Status" },
];

const bankStatementsHeader = [
  { title: "Statement Date" },
  { title: "Added on Date" },
  { title: "View" },

  { title: "Actions", restrictSorting: true },
];

const transactionsRenderData = [
  { key: "txn_date", typeOfDate: true },
  { key: "description" },
  { key: "spent_amount", enableDecimalFormat: true },
  { key: "received_amount", enableDecimalFormat: true },
  { key: "matched_to", enableHighlight: true, returnOnClickTableData: true },
  { key: "matched_to_payment_id" },
  { key: "status" },
];

const TransactionExcelColumnNames = [
  { value: "txn_date", label: "Date" },
  { value: "description", label: "Description" },
  { value: "spent_amount", label: "Spent" },
  { value: "received_amount", label: "Received" },
  { value: "matched_to", label: "Matched to" },
  { value: "matched_to_payment_id", label: "Payment id" },
  { value: "status", label: "Status" },
];

const transactionPdfHeaders = [
  "Date",
  "Description",
  "Status",
  "Matched to",
  "Payment id",
  "Spent",
];

const transactionPdfDataRow = [
  "txn_date",
  "description",
  "status",
  "matched_to",
  "matched_to_payment_id",
  "spent_amount",
];

const bankStatementPdfHeaders = ["Statement Date", "Added Date", "View"];

const bankStatementPdfDataRow = [
  "statement_date",
  "created_on",
  "bank_statement_name",
];

const bankStatementRenderData = [
  { key: "statement_date" },
  { key: "created_on" },
  { key: "bank_statement_name" },
];

const interestAndChargesHeaders = [
  { title: "Type" },
  { title: "Payment Date", typeOfDate: true },
  { title: "Amount" },
  { title: "Status" },
  { title: "Actions", restrictSorting: true },
];

const interestAndChargesArchiveHeaders = [
  interestAndChargesHeaders[0],
  interestAndChargesHeaders[1],
  interestAndChargesHeaders[2],
  interestAndChargesHeaders[3],
  { title: "View", restrictSorting: true },
];
const interestChargesRenderData = [
  { key: "payment_type" },
  { key: "payment_date", typeOfDate: true },
  { key: "payment_amount", enableDecimalFormat: true },
  { key: "list_status" },
];

const interestChargesExcelColumnNames = [
  { value: "payment_type", label: "Type" },
  { value: "payment_date", label: "Payment Date" },
  { value: "payment_amount", label: "Amount" },
  { value: "list_status", label: "Status" },
];

const interestChargesPdfHeaders = ["Type", "Payment Date", "Amount", "Status"];

const interestChargesPdfDataRow = [
  "payment_type",
  "payment_date",
  "payment_amount",
  "list_status",
];

const interestStatusDropdownOptions = [
  { label: "All" },
  { label: "Confirm payment", value: "Confirm payment" },
  // { label: "Confirm receipt", value: "Confirm receipt" },
  // { label: "Overdue", value: "Overdue" },
  { label: "Reconcile", value: "Reconcile" },
  { label: "Completed", value: "Completed" },
  { label: "Void", value: "Void" },
];

const PAYMENT_TYPES = "Other";

const interestChargesTabOptions = [
  { value: "currentAccounts", label: "Current", hasError: false },
  { value: "archivedAccounts", label: "Archived", hasError: true },
];

const statementStatus = {
  OPEN: "Open",
  LOCKED: "Locked",
};

const bankOverviewTabs = {
  TRANSACTIONS: "Transactions",
  BANK_STATEMENTS: "Bank Statements",
  INTEREST_AND_CHARGES: "Interest and Charges",
  TO_DO: "To Do",
  JOURNALS: "Journals",
};

const interestChargesTab = {
  CURRENT: "currentAccounts",
  ARCHIVE: "",
};

export {
  interestChargesTab,
  bankOverviewTabOptions,
  transactionsTabOptions,
  transactionsHeader,
  transactionsRenderData,
  bankStatementsHeader,
  bankStatementRenderData,
  interestAndChargesHeaders,
  interestChargesRenderData,
  PAYMENT_TYPES,
  TransactionExcelColumnNames,
  interestStatusDropdownOptions,
  transactionPdfHeaders,
  transactionPdfDataRow,
  bankStatementPdfHeaders,
  bankStatementPdfDataRow,
  interestChargesExcelColumnNames,
  interestChargesPdfHeaders,
  interestChargesPdfDataRow,
  interestChargesTabOptions,
  statementStatus,
  interestAndChargesArchiveHeaders,
  bankOverviewTabs,
};
