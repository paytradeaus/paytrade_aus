// Define headers dynamically
const currencyListPDFHeaders = [
  "Currency Name",
  "Currency Code",
  "Symbol, Status",
  "Status",
];

const currencyListHeaders = [
  { dataKey: "currency_name", title: "Currency Name" },
  { dataKey: "short_code", title: "Currency Code" },
  { dataKey: "symbol", title: "Symbol" },
  { dataKey: "status", title: "Status" },
  { title: "Edit", dataKey: "status", restrictSorting: true },
];

const currencyRenderData = [
  { key: "currency_name" },
  { key: "short_code" },
  { key: "symbol" },
  { key: "status" },
];

const excelColumnNames = [
  { value: "currency_name", label: "Currency Name" },
  { value: "short_code", label: "Currency Code" },
  { value: "value", label: "Symbol" },
  { value: "symbol", label: "Status" },
  { value: "status", label: "Status" },
];

const pdfDataRow = ["currency_name", "short_code", "value", "status"];

const statusOptions = [
  { value: "", label: "All" },
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

export {
  statusOptions,
  excelColumnNames,
  pdfDataRow,
  currencyListPDFHeaders,
  currencyListHeaders,
  currencyRenderData,
};
