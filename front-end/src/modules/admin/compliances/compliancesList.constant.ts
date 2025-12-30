const compliancesListHeaders = [
  { dataKey: "company_name", title: "Company Profile" },
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
  { title: "view", dataKey: "status", restrictSorting: true },
];

const compliancesRenderData = [
  { key: "company_name" },
  { key: "project_name" },
  { key: "project_added_on_date" },
  { key: "site_address" },
  { key: "role" },
  { key: "pta_compliance_modified" },
  { key: "rta_compliance__modified" },
];

const allOption = { value: null, label: "All" };

const ptaDropdownOptions = [
  allOption,
  { value: "Action required", label: "Action Required" },
  { value: "Ok", label: "Ok" },
];

const rtaDropdownOptions = [
  allOption,
  { value: "Action required", label: "Action Required" },
  { value: "Ok", label: "Ok" },
];

export {
  ptaDropdownOptions,
  rtaDropdownOptions,
  compliancesListHeaders,
  compliancesRenderData,
};
