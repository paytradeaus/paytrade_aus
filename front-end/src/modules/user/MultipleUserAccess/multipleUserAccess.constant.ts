const userAccessHeader = [
  { title: "Name", dataKey: "user_name" },
  { title: "Email", dataKey: "email_id" },
  { title: "User Type", dataKey: "user_type" },
  { title: "Status", dataKey: "status" },
  {
    title: "Date Added",
    dataKey: "date_added",
  },
];

const userAccessRenderData = [
  { key: "user_name" },
  { key: "email_id" },
  { key: "user_type" },
  { key: "status" },
  { key: "date_added" },
];

const tabOptions = [
  { label: "User Access" },
  { label: "Invitations", value: null },
  { label: "Requests", value: null },
];

const tabOptionsForBaseUser = [
  { label: "Invitations", value: null },
  { label: "Requests", value: null },
];

const invitationsHeader = [
  { title: "Name", dataKey: "user_name" },
  { title: "Business Name", dataKey: "company_name" },
  { title: "Email", dataKey: "email_id" },
  { title: "User Action", dataKey: "user_action", restrictSorting: true },
];

const invitationRenderData = [
  { key: "user_name" },
  { key: "company_name" },
  { key: "email_id" },
  { key: "user_action" },
];

const invitationRenderDataAdmin = [
  { key: "admin_name" },
  { key: "company_name" },
  { key: "admin_email" },
  { key: "user_action" },
];

const requestHeader = [
  { title: "Name", dataKey: "user_name" },
  { title: "Business Name", dataKey: "company_name" },
  { title: "Email", dataKey: "email_id" },
  { dataKey: "", title: "Actions", restrictSorting: true },
];

const requestRenderData = [
  { key: "user_name" },
  { key: "company_name" },
  { key: "email_id" },
];
const requestRenderDataAdmin = [
  { key: "admin_name" },
  { key: "company_name" },
  { key: "admin_email" },
];

const standardUserRadioOption = [
  {
    label: "Yes",
    value: "Yes",
  },
  {
    label: "No",
    value: "No",
  },
  {
    label: "View Only",
    value: "View Only",
  },
];

const standardUserRadioOtherOption = [
  {
    label: "Yes",
    value: "Yes",
  },
  {
    label: "No",
    value: "No",
  },
];

export {
  userAccessHeader,
  userAccessRenderData,
  tabOptions,
  invitationsHeader,
  invitationRenderData,
  requestRenderData,
  requestHeader,
  standardUserRadioOption,
  standardUserRadioOtherOption,
  tabOptionsForBaseUser,
  requestRenderDataAdmin,
  invitationRenderDataAdmin,
};
