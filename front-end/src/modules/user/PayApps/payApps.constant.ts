const clientAndSupplierOptions = [
  {
    value: "Client",
    label: "Client",
  },
  {
    value: "Supplier",
    label: "Supplier",
  },
];
const relatedEntityOptions = [
  {
    label: "No",
    value: "No",
  },
  {
    label: "Yes",
    value: "Yes",
  },
];
const entityTypeOptions = [
  {
    label: "Business",
    value: "Business",
  },
  {
    label: "Personal",
    value: "Personal",
  },
  {
    label: "Sole Trader",
    value: "Sole Trader",
  },
];
const clientSupplierStatus = [
  {
    label: "Draft",
    value: "Draft",
  },
  {
    label: "Completed",
    value: "Completed",
  },
];

const toggleOptions = [
  { value: "Claim", label: "Claims" },
  { value: "Retention claim", label: "Retention Claims" },
];

const claimOptions = [
  { value: "Receivable", label: "Receivables" },
  { value: "Billable", label: "Billables" },
];

const currentListActions = [
  { label: "View", value: "View" },
  { label: "Edit", value: "Edit" },
  { label: "Delete", value: "Delete", isDelete: true },
  { label: "Add payment claim", value: "Add payment claim" },
];
const archiveActions = [
  { label: "View", value: "View" },
  { label: "Undo Delete", value: "Undo Delete", isDelete: true },
];
const accountTypeOptions = [
  {
    value: "Cash Account",
    label: "General Account",
  },
  {
    value: "Project Trust Account",
    label: "Project Trust Account",
  },
  {
    value: "Retention Trust Account",
    label: "Retention Trust Account",
  },
];

const tabOptions = [{ label: "Current" }, { label: "Archived", value: null }];

// const statusOptions = [
//   { value: "", label: "All" },
//   { value: "Confirmed", label: "Confirmed" },
//   { value: "Draft", label: "Draft" },
//   { value: "No Match Required", label: "No Match Required" },
//   { value: "Paid - Matched", label: "Paid - Matched" },
//   {
//     value:
//       "Paid - Payment Matched - Retention Out Matched - Retention In Unmatched",
//     label:
//       "Paid - Payment Matched - Retention Out Matched - Retention In Unmatched",
//   },
//   {
//     value:
//       "Paid - Payment Matched - Retention Out Unmatched - Retention In Matched",
//     label:
//       "Paid - Payment Matched - Retention Out Unmatched - Retention In Matched",
//   },
//   {
//     value:
//       "Paid - Payment Matched - Retention Out Unmatched - Retention In Unmatched",
//     label:
//       "Paid - Payment Matched - Retention Out Unmatched - Retention In Unmatched",
//   },
//   { value: "Paid - Unmatched", label: "Paid - Unmatched" },
//   {
//     value:
//       "Paid - Payment Unmatched - Retention Out Matched - Retention In Matched",
//     label:
//       "Paid - Payment Unmatched - Retention Out Matched - Retention In Matched",
//   },
//   {
//     value:
//       "Paid - Payment Unmatched - Retention Out Matched - Retention In Unmatched",
//     label:
//       "Paid - Payment Unmatched - Retention Out Matched - Retention In Unmatched",
//   },
//   {
//     value:
//       "Paid - Payment Unmatched - Retention Out Unmatched - Retention In Matched",
//     label:
//       "Paid - Payment Unmatched - Retention Out Unmatched - Retention In Matched",
//   },
//   {
//     value: "Unconfirmed - Matched",
//     label: "Unconfirmed - Matched",
//   },
//   {
//     value:
//       "Unconfirmed - Payment Matched - Retention Out Matched - Retention In Unmatched",
//     label:
//       "Unconfirmed - Payment Matched - Retention Out Matched - Retention In Unmatched",
//   },
//   {
//     value:
//       "Unconfirmed - Payment Matched - Retention Out Unmatched - Retention In Matched",
//     label:
//       "Unconfirmed - Payment Matched - Retention Out Unmatched - Retention In Matched",
//   },
//   {
//     value:
//       "Unconfirmed - Payment Matched - Retention Out Unmatched - Retention In Unmatched",
//     label:
//       "Unconfirmed - Payment Matched - Retention Out Unmatched - Retention In Unmatched",
//   },
//   {
//     value:
//       "Unconfirmed - Payment Unmatched - Retention Out Matched - Retention In Matched",
//     label:
//       "Unconfirmed - Payment Unmatched - Retention Out Matched - Retention In Matched",
//   },
//   {
//     value:
//       "Unconfirmed - Payment Unmatched - Retention Out Matched - Retention In Unmatched",
//     label:
//       "Unconfirmed - Payment Unmatched - Retention Out Matched - Retention In Unmatched",
//   },
//   {
//     value:
//       "Unconfirmed - Payment Unmatched - Retention Out Unmatched - Retention In Matched",
//     label:
//       "Unconfirmed - Payment Unmatched - Retention Out Unmatched - Retention In Matched",
//   },
//   {
//     value: "Unconfirmed - Unmatched",
//     label: "Unconfirmed - Unmatched",
//   },
// ];

// const receivableOptions = [
//   { value: "", label: "All" },
//   { value: "Confirmed", label: "Confirmed" },
//   { value: "Draft", label: "Draft" },
//   { value: "No Match Required", label: "No Match Required" },
//   { value: "Received - Unmatched", label: "Received - Unmatched" },
//   { value: "Received - Matched", label: "Received - Matched" },
//   { value: "Unconfirmed - Unmatched", label: "Unconfirmed - Unmatched" },
//   { value: "Unconfirmed - Matched", label: "Unconfirmed - Matched" },
// ];

const statusOptions = [
  { value: "", label: "All" },
  { value: "Draft", label: "Draft" },
  { value: "Add payment", label: "Add payment" },
  { value: "Confirm payment", label: "Confirm payment" },
  { value: "Overdue", label: "Overdue" },
  { value: "Reconcile", label: "Reconcile" },
  { value: "Completed", label: "Completed" },
  { value: "Void", label: "Void" },
];

const receivableOptions = [
  { value: "", label: "All" },
  { value: "Draft", label: "Draft" },
  { value: "Add payment", label: "Add payment" },
  { value: "Confirm receipt", label: "Confirm receipt" },
  { value: "Overdue", label: "Overdue" },
  { value: "Reconcile", label: "Reconcile" },
  { value: "Completed", label: "Completed" },
  { value: "Void", label: "Void" },
];

const beneficiaryPaymentsModalOptions = [
  { label: "Full-Payment", value: "Full" },
  { label: "Part-Payment", value: "Part" },
];

const paymentsModalOptions = [
  ...beneficiaryPaymentsModalOptions,
  { label: "Pay Less - Full", value: "Pay Less - Full" },
  { label: "Pay Less - Part", value: "Pay Less - Part" },
  { label: "Pay - Zero", value: "Pay - Zero" },
  { label: "Pay 3rd Party", value: "3rd Party" },
];

export const ExcelColumnNames = [
  { value: "cash_retention_type", label: "Type" },
  { value: "claim_type", label: "Billable" },
  { value: "project_name", label: "Project" },
  { value: "contract_name", label: "Contract" },
  { value: "due_date", label: "Due Date" },
  { value: "claim_amount", label: "Total Claim (Gross of GST)" },
  { value: "list_status", label: "Status" },
];

export const ReceivableExcelColumnNames = [
  { value: "cash_retention_type", label: "Type" },
  { value: "claim_type", label: "Receivable" },
  { value: "project_name", label: "Project" },
  { value: "contract_name", label: "Contract" },
  { value: "due_date", label: "Due Date" },
  { value: "claim_amount", label: "Total Claim (Gross of GST)" },
  { value: "list_status", label: "Status" },
];

export const PdfheaderNames = (selectedPaymentType: any) => [
  "Type",
  selectedPaymentType === "Billable" ? "Billable" : "Receivable",
  "Project",
  "Contract",
  "Due Date",
  "Total Claim (Gross of GST)",
  "status",
];

export const payAppsheaderNames = (selectedPaymentType: any) => [
  {
    title:
      selectedPaymentType === "Billable"
        ? "Received date"
        : selectedPaymentType === "Receivable"
        ? "sent date"
        : "Received/sent date",
    dataKey: "claim_date",
  },
  { title: "Type", dataKey: "cash_retention_type" },
  {
    title:
      selectedPaymentType === "Billable"
        ? "Billable"
        : selectedPaymentType === "Receivable"
        ? "Receivable"
        : "Billable/Receivable",
    dataKey: "claim_type",
  },
  { title: "Project", dataKey: "project_name" },
  { title: "Contract", dataKey: "contract_name" },
  { title: "Due Date", dataKey: "due_date" },
  { title: "Total Claim (Gross of GST)", dataKey: "claim_amount" },
  { title: "Status", dataKey: "list_status" },
  { title: "Actions", dataKey: "", restrictSorting: true },
];

export const pdfDataRow: any[] = [
  "cash_retention_type",
  "claim_type",
  "project_name",
  "contract_name",
  "due_date",
  "claim_amount",
  "status",
];

export const paymentRenderData = [
  { key: "claim_date", typeOfDate: true },
  { key: "cash_retention_type" },
  { key: "claim_type" },
  { key: "project_name" },
  { key: "contract_name" },
  { key: "due_date" },
  { key: "claim_amount" },
  { key: "status", enableStatusIcons: true },
];

export {
  statusOptions,
  tabOptions,
  toggleOptions,
  currentListActions,
  archiveActions,
  clientAndSupplierOptions,
  relatedEntityOptions,
  entityTypeOptions,
  receivableOptions,
  clientSupplierStatus,
  accountTypeOptions,
  claimOptions,
  paymentsModalOptions,
  beneficiaryPaymentsModalOptions,
};
