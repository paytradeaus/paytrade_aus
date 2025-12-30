export const bankAccountStatusOptions = [
  { label: "View", value: "Overview" },
  { label: "Edit", value: "Edit" },
  // { value: "Draft", label: "Draft" },
  // { value: "Open", label: "Open" },
  // { value: "Active", label: "Active" },
  { value: "Closed", label: "Close", disable: true },
  // { value: "Archived", label: "Archive" },
  // { value: "Transferred", label: "Transfer" },
  { value: "Deleted", label: "Delete", isDelete: true },
];

export const bankAccountStatusOptionsForArchived = [
  { label: "View", value: "Overview" },
  { label: "Move to main list", value: "Moved" },
];

export const MESSAGE_STATUS_CHANGE = {
  Deleted: "Are you sure you wish to delete this account?",
  Draft: "Are you sure you wish to Draft this account?",
  Open: "Are you sure you wish to Open this account?",
  Closed: "Are you sure you wish to Close this account?",
  Active: "Are you sure you wish to Active this account?",
  Archived: "Are you sure you wish to Archive this account?",
  Transferred: "Are you sure you wish to Transfer this account?",
  Moved: "Are you sure you wish to Move to main list this account?",
};

export const bankAccountTypeOptions = [
  { value: "", label: "All" },
  { value: "Cash Account", label: "Cash Account" },
  { value: "Project Trust Account", label: "Project Trust Account" },
  { value: "Retention Trust Account", label: "Retention Trust Account" },
];

export const bankAccountTypes = [
  { value: "Cash Account", label: "Cash Account" },
  { value: "Project Trust Account", label: "Project Trust Account" },
  { value: "Retention Trust Account", label: "Retention Trust Account" },
];

export const bankAccountShortTypes = {
  "Cash Account": "Cash",
  "Project Trust Account": "PTA",
  "Retention Trust Account": "RTA",
};

export const tabOptions = [
  { id: "currentAccounts", label: "Current", hasError: false },
  { id: "archivedAccounts", label: "Archived", hasError: true },
  // Add more tabs as needed
];
export const statementStatus = {
  OPEN: "Open",
  LOCKED: "Locked",
};
export const tabs = [
  { id: "Transactions", label: "Transactions", hasError: false },
  { id: "bank-statements", label: "Bank Statements", hasError: true },
  {
    id: "Interest and Charges",
    label: "Interest and Charges",
    hasError: true,
  },
  { id: "To Do", label: "To Do", hasError: true },
  { id: "Journals", label: "Journals", hasError: true },
];

export const statusOptions = [
  { value: "Agreed", label: "Agreed" },
  { value: "Draft", label: "Draft" },
  { value: "In Review", label: "In Review" },
];
export const interestStatusOptions = [
  { value: "", label: "All" },
  { label: "Confirm payment", value: "Confirm payment" },
  { label: "Confirm receipt", value: "Confirm receipt" },
  { label: "Overdue", value: "Overdue" },
  { label: "Reconcile", value: "Reconcile" },
  { label: "Completed", value: "Completed" },
  { label: "Void", value: "Void" },
];

export const activityDateOptions = [
  { value: "All dates", label: "All Dates" },
  // { value: "This Month", label: "This Month" },
  { value: "Custom", label: "Custom" },
  { value: "Last Month", label: "Last Month" },
];
export const interestDateOptions = [
  { value: "All dates", label: "All Dates" },
  { value: "Custom", label: "Custom" },
  { value: "Last Month", label: "Last Month" },
];
export const PAYMENT_TYPES = "Other";

export const transactionsDateOptions = [
  { value: "", label: "All Dates" },
  { value: "Custom", label: "Custom" },
  { value: "Last Month", label: "Last Month" },
  { value: "This Month", label: "This Month" },
];
