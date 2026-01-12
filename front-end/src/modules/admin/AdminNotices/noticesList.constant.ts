// Define headers dynamically
const noticesListPDFHeaders = [
  "Date Generated",
  "Business Profile",
  "Account Name",
  "Type",
  "Notices Type",
  "Notices Source",
  "Status",
];

const noticesListHeaders = [
  { title: "Date Generated" },
  { title: "Business Profile" },
  { title: "Account Name" },
  { title: "Type" },
  { title: "Notices Type" },
  { title: "Notices Source" },
  { title: "Status" },
  { title: "Actions", restrictSorting: true },
];

const noticesListArchiveHeaders = [
  noticesListHeaders[0],
  noticesListHeaders[1],
  noticesListHeaders[2],
  noticesListHeaders[3],
  noticesListHeaders[4],
  noticesListHeaders[5],
  noticesListHeaders[6],
  { title: "View", restrictSorting: true },
];

const noticesRenderData = [
  { key: "notice_date" },
  { key: "company_name" },
  { key: "account_name" },
  { key: "bank_account_type" },
  { key: "notice_type" },
  { key: "notice_source" },
  { key: "status" },
];

const pdfDataRow = [
  "notice_date",
  "company_name",
  "account_name",
  "bank_account_type",
  "notice_type",
  "notice_source",
  "status",
];

const allOption = { name: "All", value: null };

const statusNotices = [
  {
    value: "All",
    label: "All",
  },
  { value: "Sending", label: "Sending" },
  { value: "Sent", label: "Sent" },
  { value: "Sent - Onboarded", label: "Sent - Onboarded" },
];

const noticesDateOptions = [
  { value: "", label: "All dates" },
  { value: "Custom", label: "Custom" },
  { value: "Last Month", label: "Last month" },
  { value: "This Month", label: "This month" },
];

export {
  allOption,
  statusNotices,
  pdfDataRow,
  noticesDateOptions,
  noticesListPDFHeaders,
  noticesListHeaders,
  noticesRenderData,
  noticesListArchiveHeaders,
};
