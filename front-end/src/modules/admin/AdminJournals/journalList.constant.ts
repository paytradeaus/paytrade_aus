// Define headers dynamically
const journalListPDFHeaders = [
  "Company Profile",
  "Account Name",
  "Account Type",
  "Status",
  "Balance Check",
];

const journalListHeaders = [
  { dataKey: "company_name", title: "Company Profile" },
  { dataKey: "account_name", title: "Account Name" },
  { dataKey: "account_type", title: "Account Type" },
  { dataKey: "status", title: "Status" },
  { dataKey: "balance_check", title: "Balance Check" },
  { title: "View", dataKey: "status", restrictSorting: true },
];

const journalRenderData = [
  { key: "company_name" },
  { key: "account_name" },
  { key: "account_type" },
  { key: "status" },
  { key: "balance_check" },
];

const excelColumnNames = [
  { value: "company_name", label: "Currency Name" },
  { value: "account_name", label: "Currency Code" },
  { value: "account_type", label: "Status" },
  { value: "status", label: "Status" },
  { value: "balance_check", label: "Balance Check" },
];

const pdfDataRow = [
  "company_name",
  "account_name",
  "account_type",
  "status",
  "balance_check",
];

const statusOptions = [
  { label: "All", value: "" },
  { value: "Closed", label: "Closed" },
  { value: "Open", label: "Open" },
];

const check = [
  { label: "All", value: "" },
  { value: "Error", label: "Error" },
  { value: "Ok", label: "Ok" },
];

export {
  statusOptions,
  check,
  excelColumnNames,
  pdfDataRow,
  journalListPDFHeaders,
  journalListHeaders,
  journalRenderData,
};
