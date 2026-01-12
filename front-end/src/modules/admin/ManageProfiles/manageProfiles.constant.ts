// Define headers dynamically
const pdfHeaders = [
  "Business Name",
  "Subscription Name",
  "Subscribed Amount",
  "Start Date",
  "Expiry Date",
  "Bill Cycle",
  "Status",
];

const pdfDataRow = [
  "company_name",
  "plan_name",
  "subscribed_amount",
  "start_date",
  "expiry_date",
  "bill_cycle",
  "subscription_status",
];

//constant for subscription headers list
const subscriptionProfileHeaders = [
  { title: "Business Name", dataKey: "company_name" },
  { title: "Subscription Plan", dataKey: "plan_name" },
  { title: "Subscribed Amount", dataKey: "subscribed_amount" },
  { title: "Start Date", dataKey: "start_date" },
  { title: "Expiry Date", dataKey: "expiry_date" },
  { title: "Bill Cycle", dataKey: "bill_cycle" },
  { title: "Status", dataKey: "subscription_status" },
  {
    title: "Cancel subscription",
    alignCenter: true,
    restrictSorting: true,
  },
];

const subscriptionProfileRenderData = [
  { key: "company_name" },
  { key: "plan_name" },
  { key: "subscribed_amount" },
  { key: "start_date" },
  { key: "expiry_date" },
  { key: "bill_cycle" },
  { key: "subscription_status" },
];

const statusOptions = [
  { label: "All", value: "" },
  { label: "Subscribed", value: "Subscribed" },
  { label: "Under trial", value: "Under Trial" },
  // { label: "Unsubscribed", value: "Unsubscribed" },
  { label: "Cancelled", value: "Cancelled" },
];

export {
  pdfHeaders,
  subscriptionProfileRenderData,
  pdfDataRow,
  subscriptionProfileHeaders,
  statusOptions,
};
