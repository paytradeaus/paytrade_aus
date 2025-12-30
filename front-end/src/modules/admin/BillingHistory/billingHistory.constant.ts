// Define headers dynamically
const pdfHeaders = [
  "Date",
  "Invoice number",
  "Billing Period",
  "Payment Method",
  "Amount",
  "Status",
];

const pdfDataRow = [
  "paid_at",
  "invoice_number",
  "billingDate",
  "payment_method",
  "amount_paid",
  "status",
];

//constant for subscription headers list
const billingHistoryHeaders = [
  { title: "Date", dataKey: "paid_at" },
  { title: "Invoice Number", dataKey: "invoice_number" },
  { title: "Billing Period", dataKey: "" },
  { title: "Payment Method", dataKey: "payment_method" },
  { title: "Amount", dataKey: "amount_paid" },
  { title: "Status", dataKey: "status" },
  { title: "Export", restrictSorting: true },
];

const billingHistoryRenderData = [
  { key: "paid_at" },
  { key: "invoice_number" },
  { key: "billingDate" },
  { key: "payment_method" },
  { key: "amount_paid" },
  { key: "status" },
];

const statusOptions = [
  { label: "All", value: "" },
  { label: "Subscribed", value: "Subscribed" },
  { label: "Under Trial", value: "Under Trial" },
  { label: "Unsubscribed", value: "Unsubscribed" },
];

export {
  pdfHeaders,
  billingHistoryRenderData,
  pdfDataRow,
  billingHistoryHeaders,
  statusOptions,
};
