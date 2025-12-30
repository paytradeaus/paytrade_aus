export interface ITransactions {
  description: string;
  id: string;
  matched_to: string | null;
  received_amount: number | null;
  spent_amount: number | null;
  status: string;
  txn_date: string;
  unique_txn_id: number;
  bank_account_id?: number | null;
  is_receivable?: boolean | null;
  matched_to_payment_id?: string;
}

export const BookKeepingexcelColumnNames = [
  { value: "txn_date", label: "Date" },
  { value: "description", label: "Description" },
  { value: "spent_amount", label: "Spent" },
  { value: "received_amount", label: "Received" },
  { value: "matched_to", label: "Matched to" },
  { value: "matched_to_payment_id", label: "Payment id" },
  { value: "status", label: "Status" },
];

export const BookKeepingpdfheaders: string[] = [
  "Date",
  "Description",
  "Spent",
  "Received",
  "Payment id",
  "status",
];

export const BookKeepingpdfDataRow: any[] = [
  "txn_date",
  "description",
  "spent_amount",
  "received_amount",
  "matched_to",
  "matched_to_payment_id",
  "status",
];

export const BookKeepingpdfheaderNames = [
  { title: "Date", dataKey: "txn_date" },
  { title: "Description", dataKey: "description" },
  { title: "Spent", dataKey: "spent_amount" },
  { title: "Received", dataKey: "received_amount" },
  { title: "Matched to", dataKey: "matched_to", restrictSorting: true },
  {
    title: "Payment id",
    dataKey: "matched_to_payment_id",
    restrictSorting: true,
  },
  { title: "Status", dataKey: "status" },
];

export const BookKeepingRenderData = [
  { key: "txn_date" },
  { key: "description" },
  { key: "spent_amount" },
  { key: "received_amount" },
  { key: "matched_to", enableHighlight: true, returnOnClickTableData: true },
  { key: "matched_to_payment_id" },
  { key: "status", enableStatusIcons: true },
];

export const transactionsDateOptions = [
  { value: "", label: "All dates" },
  { value: "Custom", label: "Custom" },
  { value: "Last Month", label: "Last Month" },
  { value: "This Month", label: "This Month" },
];
