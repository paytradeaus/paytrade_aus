// Define headers dynamically
const complianceListPDFHeaders = [
  "Project Name",
  "Date Added",
  "Site Address",
  "Role",
  "PTA Compliance",
  "RTA Compliance",
];

const complianceListHeaders = [
  { dataKey: "project_name", title: "Project Name" },
  { dataKey: "project_added_on_date", title: "Date Added" },
  { dataKey: "site_address", title: "Site Address" },
  { dataKey: "role", title: "Role" },
  {
    dataKey: "pta_compliance",
    title: "PTA Compliance",
    valueModified: true,
    mainDataKey: "pta_compliance",
  },
  {
    dataKey: "rta_compliance",
    title: "RTA Compliance",
    valueModified: true,
    mainDataKey: "rta_compliance",
  },
  { title: "View", dataKey: "status", restrictSorting: true },
];

const complianceRenderData = [
  { key: "project_name" },
  { key: "project_added_on_date" },
  { key: "site_address" },
  { key: "role" },
  { key: "pta_compliance" },
  { key: "rta_compliance" },
];

const excelColumnNames = [
  { value: "project_name", label: "Project Name" },
  { value: "project_added_on_date", label: "Date Added" },
  { value: "site_address", label: "Site Address" },
  { value: "role", label: "Role" },
  { value: "pta_compliance", label: "PTA Compliance" },
  { value: "rta_compliance", label: "RTA Compliance" },
];

const pdfDataRow = [
  "project_name",
  "project_added_on_date",
  "site_address",
  "role",
  "pta_compliance",
  "rta_compliance",
];

export {
  excelColumnNames,
  pdfDataRow,
  complianceRenderData,
  complianceListHeaders,
  complianceListPDFHeaders,
};
