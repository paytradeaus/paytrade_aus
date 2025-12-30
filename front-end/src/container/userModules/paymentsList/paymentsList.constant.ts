export const PAYMENT_OPTIONS = [
  { label: "All", value: "All" },
  { label: "Bank Charge Applied", value: "Bank Charge Applied" },
  { label: "Bank Charge Top-up", value: "Bank Charge Top Up" },
  { label: "Full", value: "Full" },
  { label: "Interest Received", value: "Interest Received" },
  { label: "Interest Withdrawal", value: "Interest Withdrawal" },
  { label: "Overpayment from client", value: "Overpayment from client" },
  {
    label: "Overpayment refund from supplier",
    value: "Overpayment refund from supplier",
  },
  {
    label: "Overpayment refund to client",
    value: "Overpayment refund to client",
  },
  { label: "Overpayment to supplier", value: "Overpayment to supplier" },
  { label: "Part", value: "Part" },
  { label: "Pay - Zero", value: "Pay - Zero" },
  { label: "Pay Less - Full", value: "Pay Less - Full" },
  { label: "Pay Less - Part", value: "Pay Less - Part" },
  { label: "Top Up", value: "Top Up" },
  { label: "Top Up Retention", value: "Top Up Retention" },
  { label: "Underpayment from client", value: "Underpayment from client" },
  { label: "Underpayment to supplier", value: "Underpayment to supplier" },
  { label: "Withdrawal", value: "Withdrawal" },
];

export interface ActionItem {
  label: string;
  value: string;
  isDelete?: boolean;
}

export const PAYMENT_CLAIM_OPTIONS = [
  {
    label: "All",
    value: "",
  },
  {
    label: "Payment Claim",
    value: "Claim",
  },
  {
    label: "Retention claim",
    value: "Retention claim",
  },
];

export const TOGGLE_OPTIONS = [
  { value: "All", label: "All" },
  {
    value: "Receivable",
    label: "Receivable",
  },
  {
    value: "Billable",
    label: "Billable",
  },
];

export const overviewModeType = {
  CONTRACTS: "contracts",
  PROJECTS: "projects",
};
