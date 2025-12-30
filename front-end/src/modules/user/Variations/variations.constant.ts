// Define headers dynamically
const variationsListPDFHeaders = [
  "Date Created",
  "Variation ID",
  "Project Name",
  "Contract Name",
  "Variation Amount",
  "Status",
];

const variationsListHeaders = [
  { dataKey: "created_on", title: "Date Created" },
  { dataKey: "variation_id", title: "Variation ID" },
  { dataKey: "project_name", title: "Project Name" },
  { dataKey: "contract_name", title: "Contract Name" },
  { dataKey: "variation_amount", title: "Variation Amount" },
  { dataKey: "variation_status", title: "Status" },
];

const variationsRenderData = [
  { key: "created_on" },
  { key: "variation_id" },
  { key: "project_name" },
  { key: "contract_name" },
  { key: "variation_amount" },
  { key: "variation_status" },
];

const variationStatusOptions = [
  { value: "All", label: "All" },
  { value: "Agreed", label: "Agreed" },
  { value: "Draft", label: "Draft" },
  { value: "In Review", label: "In Review" },
  { value: "Refused", label: "Refused" },
];

const addVariationStatusOptions = [
  {
    value: "Draft",
    label: "Draft",
  },
  {
    value: "In Review",
    label: "In Review",
  },
  {
    value: "Agreed",
    label: "Agreed",
  },
  {
    value: "Refused",
    label: "Refused",
  },
  {
    value: "Deleted",
    label: "Deleted",
  },
];

const excelColumnNames = [
  { value: "created_on", label: "Date Created" },
  { value: "variation_id", label: "Variation ID" },
  { value: "project_name", label: "Project Name" },
  { value: "contract_name", label: "Contract Name" },
  { value: "variation_amount", label: "Variation Amount" },
  { value: "variation_status", label: "Status" },
];

const pdfDataRow = [
  "created_on",
  "variation_id",
  "project_name",
  "contract_name",
  "variation_amount",
  "variation_status",
];

export {
  variationStatusOptions,
  excelColumnNames,
  pdfDataRow,
  variationsRenderData,
  variationsListHeaders,
  variationsListPDFHeaders,
  addVariationStatusOptions,
};
