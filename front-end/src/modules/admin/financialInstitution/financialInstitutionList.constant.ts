// Define headers dynamically
const currencyListPDFHeaders = ["Name", "Status", "Date Added"];

const financialInstitutionListHeaders = [
  { dataKey: "institution_name", title: "Name" },
  { dataKey: "institution_status", title: "Status" },
  { dataKey: "created_on", title: "Date Added" },
  { title: "Edit", dataKey: "status", restrictSorting: true },
];

const financialInstitutionRenderData = [
  { key: "institution_name" },
  { key: "institution_status" },
  { key: "created_on" },
];

const excelColumnNames = [
  { value: "institution_name", label: "Name" },
  { value: "institution_status", label: "Status" },
  { value: "created_on", label: "Date Added" },
];

const pdfDataRow = [
  "institution_name",
  "institution_status",
  "created_on",
  "status",
];

const statusOptions = [
  { value: "", label: "All" },
  { value: "Active", label: "Active" },
  { value: "Archived", label: "Archived" },
  { value: "Blocked", label: "Blocked" },
  { value: "Inactive", label: "Inactive" },
];

export {
  statusOptions,
  excelColumnNames,
  pdfDataRow,
  currencyListPDFHeaders,
  financialInstitutionListHeaders,
  financialInstitutionRenderData,
};
