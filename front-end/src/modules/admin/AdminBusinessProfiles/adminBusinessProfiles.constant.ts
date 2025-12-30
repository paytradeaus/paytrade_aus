// Define headers dynamically
const businessListPDFHeaders = [
  "Business ID",
  "Trading Type",
  "Business Name",
  "Legal Business Name",
  "Subscription Valid",
  "Subscription Type",
  "Admin Blocked",
];

const businessListHeaders = [
  { dataKey: "company_id", title: "Business ID" },
  { dataKey: "entity_type", title: "Trading Type" },
  { dataKey: "company_name", title: "Business Name" },
  { dataKey: "legal_company_name", title: "Legal Business Name" },
  { dataKey: "expiry_date", title: "Subscription Valid", typeOfDate: true },
  { dataKey: "plan_name", title: "Subscription Type" },
  { dataKey: "is_admin_blocked", title: "Admin Blocked" },
  { title: "Actions", dataKey: "status", restrictSorting: true },
];

const businessRenderData = [
  { key: "company_id" },
  { key: "entity_type" },
  { key: "company_name" },
  { key: "legal_company_name" },
  { key: "expiry_date" },
  { key: "plan_name" },
  { key: "is_admin_blocked" },
];

const excelColumnNames = [
  { value: "company_id", label: "Business ID" },
  { value: "entity_type", label: "Trading Type" },
  { value: "company_name", label: "Business Name" },
  { value: "legal_company_name", label: "Legal Business Name" },
  { value: "expiry_date", label: "Subscription Valid" },
  { value: "plan_name", label: "Subscription Type" },
  { value: "is_admin_blocked", label: "Admin Blocked" },
];

const pdfDataRow = [
  "company_id",
  "entity_type",
  "company_name",
  "legal_company_name",
  "expiry_date",
  "plan_name",
  "is_admin_blocked",
];

const statusOptions = [
  { value: "All", label: "All" },
  { value: "Blocked", label: "Blocked" },
  { value: "UnBlocked", label: "Unblocked" },
];

export {
  statusOptions,
  excelColumnNames,
  pdfDataRow,
  businessListPDFHeaders,
  businessListHeaders,
  businessRenderData,
};
