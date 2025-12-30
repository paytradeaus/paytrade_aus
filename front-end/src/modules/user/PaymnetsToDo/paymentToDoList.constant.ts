export const STATUS_OPTIONS = [
  {
    label: "Un matched",
    value: "Unmatched",
  },
  {
    label: "Matched",
    value: "Matched",
  },
  {
    label: "For Review",
    value: "To Review",
  },
];
export const tabOptions = [
  { id: "Not Paid", label: "Not Paid", hasError: false },
  // { id: "Un paid", label: "Un paid", hasError: false },
  { id: "Paid", label: "Paid", hasError: false },
  { id: "My activity", label: "aba history", hasError: false },

  // Add more tabs as needed
];

export const filter_paid_options = [
  {
    label: "All",
    value: "",
  },
  {
    label: "Not paid",
    value: "notPaid",
  },
  {
    label: "Overdue",
    value: "late",
  },
];

export const ExcelColumnNames = [
  { value: "payment_id", label: "Payment Id" },
  { value: "payment_type", label: "Payment Type" },
  { value: "amount", label: "Payment Amount" },
  { value: "payment_from_account", label: "Payment From Account" },
  { value: "payment_to_account_name", label: "Payment To Account Name" },
  { value: "payment_to_account_number", label: "Payment To Account Number" },
  { value: "payment_to_account_bsb_number", label: "Payment To Account BSB" },
  { value: "list_status", label: "Status" },
];

export const PdfheaderNames: string[] = [
  "Payment Id",
  "Payment Type",
  "Payment Amount",
  "Payment From Account",
  "Payment To Account Name",
  "Payment To Account Number",
  "Payment To Account BSB",
  "status",
];

export const headerNames: string[] = [
  "Payment Id",
  "Payment Type",
  "Payment Amount",
  "Payment From Account",
  "Payment To Account Name",
  "Payment To Account Number",
  "Payment To Account BSB",
  "status",
];

export const toDoHeaderNames = [
  { title: "Payment Id", dataKey: "payment_id" },
  { title: "Payment Type", dataKey: "payment_type" },
  { title: "Payment Amount", dataKey: "amount" },
  { title: "Payment From Account", dataKey: "payment_from_account_name" },
  { title: "Payment To Account Name", dataKey: "payment_to_account_name" },
  {
    title: "Payment To Account Number",
    dataKey: "payment_to_account_number",
    restrictSorting: true,
  },
  { title: "Payment To Account BSB", dataKey: "payment_to_account_bsb_number" },
  { title: "Status", dataKey: "list_status" },
  { title: "Actions", dataKey: "", restrictSorting: true },
];

export const myActivityHeaderNames = [
  { title: "Generated date" },
  { title: "Account name" },
  { title: "Paid?" },
  // { title: "Sent Notices?" },
  { title: "Download", dataKey: "", restrictSorting: true },
];
export const pdfDataRow: any[] = [
  "payment_id",
  "payment_type",
  "amount",
  "payment_from_account_name",
  "payment_to_account_name",
  "payment_to_account_number",
  "payment_to_account_bsb_number",
  "list_status",
];

export const paymentRenderData = [
  { key: "payment_id" },
  { key: "payment_type" },
  { key: "amount" },
  { key: "payment_from_account_name" },
  { key: "payment_to_account_name" },
  { key: "payment_to_account_number" },
  { key: "payment_to_account_bsb_number" },
  { key: "list_status", enableStatusIcons: true },
];

export const abaPaymentRenderData = [
  { key: "created_on" },
  { key: "account_name" },
  { key: "mark_paid" },
  // { key: "mark_paid" },
];

export const filterByDuration = [
  {
    label: "All",
    value: null,
  },
  { value: "Last Month", label: "Last Month" },
  { value: "Custom", label: "Custom" },
];
