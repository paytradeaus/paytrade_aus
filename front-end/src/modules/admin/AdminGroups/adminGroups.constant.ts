// Define headers dynamically
const adminGroupsListPDFHeaders = [
  "Group Name",
  "Group Description",
  "Group Status",
  "Created On",
];

const adminGroupsListHeaders = [
  { dataKey: "group_name", title: "Name" },
  { dataKey: "group_description", title: "Description" },
  { dataKey: "group_status", title: "Status" },
  { dataKey: "created_on", title: "Date Added" },
  { title: "Actions", dataKey: "status", restrictSorting: true },
];

const adminGroupsRenderData = [
  { key: "group_name" },
  { key: "group_description" },
  { key: "group_status" },
  { key: "created_on" },
];

const excelColumnNames = [
  { value: "group_name", label: "Name" },
  { value: "group_description", label: "Description" },
  { value: "group_status", label: "Status" },
  { value: "created_on", label: "Date Added" },
];

const pdfDataRow = [
  "group_name",
  "group_description",
  "group_status",
  "created_on",
];

const statusOptions = [
  { value: "All", label: "All" },
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

export {
  statusOptions,
  excelColumnNames,
  pdfDataRow,
  adminGroupsListPDFHeaders,
  adminGroupsListHeaders,
  adminGroupsRenderData,
};
