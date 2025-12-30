// Define headers dynamically
const contactListPDFHeaders = [
  "Name",
  "Email",
  "Status",
  "Message",
  "Date Received",
];

const contactSubmissionStatus = [
  {
    label: "Closed",
    value: "Closed",
  },
  {
    label: "Contacted",
    value: "Contacted",
  },
  {
    label: "Received",
    value: "Received",
  },
];

const contactListHeaders = [
  { dataKey: "name", title: "Name" },
  { dataKey: "email", title: "Email" },
  { dataKey: "status", title: "Status" },
  { dataKey: "message", title: "Message" },
  { dataKey: "received_date", title: "Date Received" },
  { title: "edit", dataKey: "status", restrictSorting: true },
];

const contactRenderData = [
  { key: "name" },
  { key: "email" },
  { key: "status" },
  { key: "message" },
  { key: "received_date" },
];

const excelColumnNames = [
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "status", label: "Status" },
  { value: "message", label: "Message" },
  { value: "received_date", label: "Date Received" },
];

const pdfDataRow = ["name", "toEmails", "status", "message", "received_date"];

export {
  excelColumnNames,
  pdfDataRow,
  contactListPDFHeaders,
  contactListHeaders,
  contactRenderData,
  contactSubmissionStatus,
};
