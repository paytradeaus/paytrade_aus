// Define headers dynamically
const delegationListPDFHeaders = [
  "Business Name",
  "Bank Account Name",
  "Account Type",
  "Delegation",
];

const delegationListHeaders = [
  { dataKey: "company_name", title: "Business Name" },
  { dataKey: "account_name", title: "Bank Account Name" },
  { dataKey: "account_type", title: "Account Type" },
  { dataKey: "delegation", title: "Delegation" },
];

const delegationRenderData = [
  { key: "company_name" },
  { key: "account_name" },
  { key: "account_type" },
  { key: "delegation" },
];

const excelColumnNames = [
  { value: "company_name", label: "Business Name" },
  { value: "account_name", label: " Bank Account Name" },
  { value: "account_type", label: "Account Type" },
  { value: "delegation", label: "Delegation" },
];

const pdfDataRow = [
  "company_name",
  "account_name",
  "account_type",
  "delegation",
];

export {
  excelColumnNames,
  pdfDataRow,
  delegationRenderData,
  delegationListHeaders,
  delegationListPDFHeaders,
};
