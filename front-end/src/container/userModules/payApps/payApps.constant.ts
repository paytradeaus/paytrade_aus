import { EDIT, DELETE } from "@/common/constants/general";

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
  { label: "Edit", value: EDIT },
  { label: DELETE, value: DELETE, isDelete: true },
  { label: "Add payment claim", value: "Add payment claim" },
];
const archiveActions = [
  { label: "View", value: "View" },
  { label: "Undo Delete", value: "Undo Delete", isDelete: true },
];
const accountTypeOptions = [
  {
    value: "Cash Account",
    label: "Cash Account",
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

const tabOptions = [
  {
    id: "Current Projects",
    label: "Current",
    hasError: false,
  },
  {
    id: "Archived Projects",
    label: "Archived",
    hasError: false,
  },
];

const statusOptions = [
  { value: "Draft", label: "Draft" },
  { value: "Add payment", label: "Add payment" },
  { value: "Confirm payment", label: "Confirm payment" },
  { value: "Overdue", label: "Overdue" },
  { value: "Reconcile", label: "Reconcile" },
  { value: "Completed", label: "Completed" },
  { value: "Void", label: "Void" },
];

const receivableOptions = [
  { value: "Draft", label: "Draft" },
  { value: "Add payment", label: "Add payment" },
  { value: "Confirm receipt", label: "Confirm receipt" },
  { value: "Overdue", label: "Overdue" },
  { value: "Reconcile", label: "Reconcile" },
  { value: "Completed", label: "Completed" },
  { value: "Void", label: "Void" },
];

// const statusOptions = [
//   { value: "", label: "All" },
//   { value: "Confirmed", label: "Approved" },
//   { value: "Draft", label: "Draft" },
//   { value: "No Match Required", label: "No Match Required" },
//   { value: "Paid - Matched", label: "Paid - Matched" },
//   { value: "Add Next Payment", label: "Add Next Payment" },
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
//   { value: "Confirmed", label: "Approved" },
//   { value: "Draft", label: "Draft" },
//   { value: "Add Next Payment", label: "Add Next Payment" },
//   { value: "No Match Required", label: "No Match Required" },
//   { value: "Received - Unmatched", label: "Received - Unmatched" },
//   { value: "Received - Matched", label: "Received - Matched" },
//   { value: "Unconfirmed - Unmatched", label: "Unconfirmed - Unmatched" },
//   { value: "Unconfirmed - Matched", label: "Unconfirmed - Matched" },
// ];

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
