// Define headers dynamically
const usersListPDFHeaders = [
  "First Name",
  "Last Name",
  "Email ID",
  "User Role",
  "Position",
  "User Address",
  "User Phone Number",
  "User Status",
];

const usersListHeaders = [
  { dataKey: "user_id", title: "User id" },
  { dataKey: "first_name", title: "First Name" },
  { dataKey: "last_name", title: "Last Name" },
  { dataKey: "email_id", title: "Email ID" },
  { dataKey: "user_role", title: "User Role" },
  { dataKey: "position_title", title: "Position" },
  { dataKey: "user_phone_no", title: "User Phone Number" },
  { dataKey: "occupation", title: "occupation" },
  { dataKey: "is_admin_contacted_modified", title: "New Users" },
  { dataKey: "user_status", title: "User Status" },
  { title: "Actions", dataKey: "status", restrictSorting: true },
];

const usersRenderData = [
  { key: "user_id" },
  { key: "first_name" },
  { key: "last_name" },
  { key: "email_id" },
  { key: "user_role" },
  { key: "position_title" },
  { key: "user_phone_no" },
  { key: "occupation" },
  { key: "is_admin_contacted_modified" },
  { key: "user_status" },
];

const excelColumnNames = [
  { value: "first_name", label: "First Name" },
  { value: "last_name", label: "Last Name" },
  { value: "email_id", label: "Email ID" },
  { value: "user_role", label: "User Role" },
  { value: "position_title", label: "Position" },
  { value: "user_address", label: "User Address" },
  { value: "user_phone_no", label: "User Phone Number" },
  { value: "user_status", label: "User Status" },
];

const pdfDataRow = [
  "first_name",
  "last_name",
  "email_id",
  "user_role",
  "position_title",
  "user_address",
  "user_phone_no",
  "user_status",
];

const statusOptions = [
  { value: "All", label: "All" },
  { value: "Active", label: "Active" },
  { value: "Blocked", label: "Blocked" },
  { value: "Inactive", label: "Inactive" },
];

export {
  statusOptions,
  excelColumnNames,
  pdfDataRow,
  usersListPDFHeaders,
  usersListHeaders,
  usersRenderData,
};
