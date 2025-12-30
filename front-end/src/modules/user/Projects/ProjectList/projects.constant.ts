const roleTypeOptions = [
  { value: "", label: "All" },
  { value: "Head Contractor", label: "Head Contractor" },
  { value: "Principal", label: "Principal" },
  { value: "Sub Contractor", label: "Subcontractor" },
];

const tabOptions = [{ label: "Current" }, { label: "Archived", value: null }];

const ProjectsHeaders = [
  { title: "Project Name", dataKey: "project_name" },
  { title: "Date Added", dataKey: "project_date" },
  { title: "Site Address", dataKey: "site_address" },
  { title: "Role", dataKey: "project_role" },
  {
    title: "Compliance",
    mainDataKey: "compliance",
    dataKey: "compliance_modified",
    valueModified: true,
  },
  { title: "Number of Units", dataKey: "number_of_units" },
  { title: "PTA Eligible?", dataKey: "pta_eligibility" },
  { title: "RTA Eligible?", dataKey: "rta_eligibility" },
  { title: "Actions", dataKey: "status", restrictSorting: true },
];

const pdfDataRow = [
  "project_name",
  "project_date",
  "site_address",
  "project_role",
  "compliance",
  "number_of_units",
  "pta_eligibility",
  "rta_eligibility",
];

const projectsRenderData = [
  { key: "project_name" },
  { key: "project_date" },
  { key: "site_address", wrapData: true },
  { key: "project_role" },
  { key: "compliance", returnOnClickTableData: true },
  { key: "number_of_units" },
  { key: "pta_eligibility" },
  { key: "rta_eligibility" },
];
const pdfHeaders = [
  "Project Name",
  "Date Added",
  "Site Address",
  "Role",
  "Compliance",
  "Number of Units",
  "PTA Eligible?",
  "RTA Eligible?",
];
const excelColumnNames = [
  { value: "bank_account_id", label: "Bank Account ID" },
  { value: "account_name", label: "Account Name" },
  { value: "account_type", label: "Account Type" },
  { value: "projects_count", label: "Projects Count" },
  { value: "created_on", label: "Added on Date" },
  { value: "current_balance", label: "Current Balance" },
  { value: "updated_on", label: "Last Updated" },
  { value: "last_updated_type", label: "Updated Type" },
  { value: "status", label: "Status" },
];

export {
  roleTypeOptions,
  tabOptions,
  ProjectsHeaders,
  projectsRenderData,
  excelColumnNames,
  pdfDataRow,
  pdfHeaders,
};
