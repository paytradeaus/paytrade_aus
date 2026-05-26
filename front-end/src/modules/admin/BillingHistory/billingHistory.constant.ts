// Define headers dynamically
const pdfHeaders = [
  "Date",
  "Invoice number",
  "Billing Period",
  "Payment Method",
  "Ex-GST",
  "GST",
  "Amount",
  "Status",
];

const pdfDataRow = [
  "paid_at",
  "invoice_number",
  "billingDate",
  "payment_method",
  "total_ex_gst_display",
  "gst_amount_display",
  "amount_paid",
  "status",
];

//constant for subscription headers list
const billingHistoryHeaders = [
  { title: "Date", dataKey: "paid_at" },
  { title: "Invoice Number", dataKey: "invoice_number" },
  { title: "Billing Period", dataKey: "" },
  { title: "Payment Method", dataKey: "payment_method" },
  { title: "Ex-GST", restrictSorting: true },
  { title: "GST (10%)", restrictSorting: true },
  { title: "Amount", dataKey: "amount_paid" },
  { title: "Status", dataKey: "status" },
  { title: "Export", restrictSorting: true },
];

const billingHistoryRenderData = [
  { key: "paid_at" },
  { key: "invoice_number" },
  { key: "billingDate" },
  { key: "payment_method" },
  { key: "total_ex_gst_display" },
  { key: "gst_amount_display" },
  { key: "amount_paid" },
  { key: "status" },
];

const statusOptions = [
  { label: "All", value: "" },
  { label: "Subscribed", value: "Subscribed" },
  { label: "Under Trial", value: "Under Trial" },
  { label: "Unsubscribed", value: "Unsubscribed" },
];

// Task #312 — format the GST split cell consistently in admin grid + PDF.
// The `is_gst_inclusive` flag changes only the label suffix; the dollar
// numbers are identical (gst = total/11 for both modes).
function formatMoney(value: any): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return `$${n.toFixed(2)}`;
}
function formatGstAmountCell(row: any): string {
  const gst = formatMoney(row?.gst_amount);
  if (!gst) return "";
  return row?.is_gst_inclusive ? `${gst} (incl.)` : gst;
}
function formatExGstCell(row: any): string {
  return formatMoney(row?.total_ex_gst);
}

export {
  pdfHeaders,
  billingHistoryRenderData,
  pdfDataRow,
  billingHistoryHeaders,
  statusOptions,
  formatGstAmountCell,
  formatExGstCell,
};
