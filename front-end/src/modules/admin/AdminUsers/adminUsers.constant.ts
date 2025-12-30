// Define headers dynamically
const adminUsersListPDFHeaders = [
  "Name",
  "Email ID",
  "User Type",
  "Status",
  "Date Added",
];

const adminUsersListHeaders = [
  { dataKey: "first_name", title: "Name" },
  { dataKey: "email_id", title: "Email" },
  { dataKey: "admin_role", title: "User Type" },
  { dataKey: "admin_status", title: "Status" },
  { dataKey: "created_on", title: "Date Added" },
  { title: "Actions", dataKey: "status", restrictSorting: true },
];

const adminUsersRenderData = [
  { key: "names" },
  { key: "email_id" },
  { key: "admin_role" },
  { key: "admin_status" },
  { key: "created_on" },
];

const excelColumnNames = [
  { value: "first_name", label: "First Name" },
  { value: "last_name", label: "Last Name" },
  { value: "email_id", label: "Email ID" },
  { value: "admin_role", label: "Admin Role" },
  { value: "admin_status", label: "Admin Status" },
];

const pdfDataRow = [
  "first_name",
  "last_name",
  "email_id",
  "admin_role",
  "admin_status",
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
  adminUsersListPDFHeaders,
  adminUsersListHeaders,
  adminUsersRenderData,
};
