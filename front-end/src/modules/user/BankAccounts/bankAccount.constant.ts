const bankAccountTypeOptions = [
  { value: "All", label: "All" },
  { value: "Retention Trust Account", label: "Retention Trust Account" },
  { value: "Project Trust Account", label: "Project Trust Account" },
  { value: "Cash Account", label: "Cash Account" },
];

const tabOptions = [{ label: "Current" }, { label: "Archived", value: null }];

const queryParamsData = {
  RTA: "rta",
  PTA: "pta",
  cash: "cash",
};

const queryParamsVar = {
  ACCOUNT_TYPE: "account_type",
};

// Define headers dynamically
const pdfHeaders = [
  // "Bank Account ID",
  "Account Name",
  "Account Type",
  "Projects Count",
  "Added on Date",
  "Current Balance",
  "Last Updated",
  "Update Type",
  "Status",
];

const pdfDataRow = [
  // "bank_account_id",
  "account_name",
  "account_type",
  "projects_count",
  "created_on",
  "current_balance",
  "updated_on",
  "last_updated_type",
  "status",
];

const bankAccountRenderData = [
  // { key: "bank_account_id" },
  { key: "account_name", enableHighlight: true },
  { key: "account_type" },
  { key: "projects_count" },
  { key: "created_on" },
  { key: "current_balance" },
  { key: "updated_on" },
  { key: "last_updated_type" },
  { key: "status", enableStatusIcons: true },
];

const excelColumnNames = [
  // { value: "bank_account_id", label: "Bank Account ID" },
  { value: "account_name", label: "Account Name" },
  { value: "account_type", label: "Account Type" },
  { value: "projects_count", label: "Projects Count" },
  { value: "created_on", label: "Added on Date" },
  { value: "current_balance", label: "Current Balance" },
  { value: "updated_on", label: "Last Updated" },
  { value: "last_updated_type", label: "Updated Type" },
  { value: "status", label: "Status" },
];

//constant for bank accounts list header
const bankAccountHeaders = [
  // { title: "Bank Account ID", dataKey: "bank_account_id" },
  { title: "Account Name", dataKey: "account_name" },
  { title: "Account Type", dataKey: "account_type" },
  { title: "Projects Count", dataKey: "projects_count" },
  { title: "Added on Date", dataKey: "created_on" },
  { title: "Current Balance", dataKey: "current_balance" },
  { title: "Last Updated", dataKey: "updated_on" },
  { title: "Update Type", dataKey: "last_updated_type" },
  { title: "Status", dataKey: "status" },
  { title: "Actions", dataKey: "status", restrictSorting: true },
];

const RTAGridHeaders = [
  { title: "ID", restrictSorting: true },
  { title: "Name", restrictSorting: true },
];

const RTARenderData = [{ key: "value" }, { key: "label" }];

export {
  RTAGridHeaders,
  bankAccountTypeOptions,
  tabOptions,
  pdfHeaders,
  bankAccountRenderData,
  excelColumnNames,
  pdfDataRow,
  bankAccountHeaders,
  RTARenderData,
  queryParamsData,
  queryParamsVar,
};
