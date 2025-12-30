const checkBoxConfirmationMessage =
  "Are you sure you wish to mark this payment as";

const matchTransactionListHeaders = [
  { dataKey: "transaction_date", title: "Date", restrictSorting: true },
  { dataKey: "description", title: "Description", restrictSorting: true },
  { dataKey: "spent", title: "Spent", restrictSorting: true },
  { dataKey: "received", title: "Received", restrictSorting: true },
];

const matchTransactionRenderData = [
  { key: "transaction_date" },
  { key: "description" },
  { key: "spent" },
  { key: "received" },
];

const matchPaymentsListHeaders = [
  {
    dataKey: "payment_transaction_id",
    title: "Payment Transaction Id",
    restrictSorting: true,
  },
  {
    dataKey: "sub_payment_type",
    title: "Payment Transaction Type",
    restrictSorting: true,
  },
  {
    dataKey: "payment_to_account_name",
    title: "To Account Name",
    restrictSorting: true,
  },
  { dataKey: "payment_amount", title: "Payment Amount", restrictSorting: true },
];

const matchPaymentsRenderData = [
  { key: "payment_transaction_id" },
  { key: "sub_payment_type" },
  { key: "payment_to_account_name" },
  { key: "payment_amount", enableDecimalFormat: true },
];
export {
  checkBoxConfirmationMessage,
  matchTransactionListHeaders,
  matchTransactionRenderData,
  matchPaymentsRenderData,
  matchPaymentsListHeaders,
};
