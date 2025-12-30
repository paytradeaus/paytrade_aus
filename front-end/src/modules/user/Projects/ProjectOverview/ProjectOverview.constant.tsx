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
  { id: "Contracts", label: "Contracts" },
  { id: "Claims", label: "Claims" },
  { id: "Payments", label: "Payments" },
  { id: "Clients & Suppliers", label: "Clients And Suppliers" },
  { id: "Variations", label: "Variations" },
  { id: "Accounts", label: "Bank Accounts" },
  { id: "Retentions", label: "Retentions" },
  {
    id: "Notices",
    label: "Notices",
  },
  { id: "Journals", label: "Journals" },
  { id: "Compliances", label: "Compliances" },
];

const transactionsHeader = [
  { title: "Date" },
  { title: "Description" },
  { title: "Spent" },
  { title: "Received" },
  { title: "Matched To?" },
  { title: "Status" },
  { title: "Actions", restrictSorting: true },
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
  { key: "matched_to" },
  { key: "status" },
];

const TransactionExcelColumnNames = [
  { value: "txn_date", label: "Date" },
  { value: "description", label: "Description" },
  { value: "spent_amount", label: "Spent" },
  { value: "received_amount", label: "Received" },
  { value: "matched_to", label: "Matched To" },
  { value: "status", label: "Status" },
];

const transactionPdfHeaders = [
  "Date",
  "Description",
  "Status",
  "Matched To",
  "Spent",
];

const transactionPdfDataRow = [
  "txn_date",
  "description",
  "status",
  "matched_to",
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

const interestChargesRenderData = [
  { key: "payment_type" },
  { key: "payment_date", typeOfDate: true },
  { key: "payment_amount", enableDecimalFormat: true },
  { key: "status" },
];

const interestChargesExcelColumnNames = [
  { value: "payment_type", label: "Type" },
  { value: "payment_date", label: "Payment Date" },
  { value: "payment_amount", label: "Amount" },
  { value: "status", label: "Status" },
];

const interestChargesPdfHeaders = ["Type", "Payment Date", "Amount", "Status"];

const interestChargesPdfDataRow = [
  "payment_type",
  "payment_date",
  "payment_amount",
  "status",
];

const interestStatusDropdownOptions = [
  { label: "All" },
  { label: "Confirm payment", value: "Confirm payment" },
  { label: "Confirm receipt", value: "Confirm receipt" },
  { label: "Overdue", value: "Overdue" },
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

const projectOverviewTabs = {
  CONTRACTS: "Contracts",
  CLAIMS: "Claims",
  PAYMENTS: "Payments",
  CLIENTSANDSUPPLIERS: "Clients And Suppliers",
  VARIATIONS: "Variations",
  BANK_ACCOUNTS: "Bank Accounts",
  RETENTIONS: "Retentions",
  NOTICES: "Notices",
  JOURNALS: "Journals",
  COMPLIANCES: "Compliances",
};

export {
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
  projectOverviewTabs,
};
