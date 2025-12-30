// Define headers dynamically
const mastersListPDFHeaders = ["Master Type", "Value", "Description"];

const mastersListHeaders = [
  { dataKey: "master_type", title: "Master Type" },
  { dataKey: "value", title: "Value" },
  { dataKey: "description", title: "Description" },
  { dataKey: "status", title: "Status" },

  { title: "Edit", dataKey: "status", restrictSorting: true },
];

const mastersRenderData = [
  { key: "master_type" },
  { key: "value" },
  { key: "description" },
  { key: "status" },
];

const excelColumnNames = [
  { value: "master_type", label: "Master Type" },
  { value: "value", label: "Value" },
  { value: "description", label: "Description" },
];

const pdfDataRow = ["master_type", "value", "description"];

export {
  // categoryOptions,
  excelColumnNames,
  pdfDataRow,
  mastersListPDFHeaders,
  mastersListHeaders,
  mastersRenderData,
};
