// Define headers dynamically
const communicationListPDFHeaders = ["Date Sent", "To", "Subject"];

const communicationListHeaders = [
  { dataKey: "created_on", title: "Date Sent" },
  { dataKey: "toEmails", title: "To" },
  { dataKey: "subject", title: "Subject" },
  { title: "View", dataKey: "status", restrictSorting: true },
];

const communicationRenderData = [
  { key: "created_on" },
  { key: "toEmails" },
  { key: "subject" },
];

const excelColumnNames = [
  { value: "created_on", label: "Date Sent" },
  { value: "toEmails", label: "To" },
  { value: "subject", label: "Subject" },
];

const pdfDataRow = ["created_on", "toEmails", "subject"];

export {
  excelColumnNames,
  pdfDataRow,
  communicationListPDFHeaders,
  communicationListHeaders,
  communicationRenderData,
};
