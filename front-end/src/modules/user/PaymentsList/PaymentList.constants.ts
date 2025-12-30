import { AppRoutes } from "@/shared/constant/appRoutes";

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

export const tabOptions = [
  { id: "currentAccounts", label: "Current", hasError: false },
  { id: "archivedAccounts", label: "Archived", hasError: true },
  // Add more tabs as needed
];

export const PdfheaderNames = [
  { title: "Payment Date", dataKey: "payment_date" },
  { title: "Payment Type", dataKey: "payment_type" },
  { title: "Project", dataKey: "project_name" },
  { title: "Contract", dataKey: "contract_name" },
  { title: "Payment From Account Name", dataKey: "payment_from_account_name" },
  { title: "Payment To Account Name", dataKey: "payment_to_account_name" },
  { title: "Payment Amount", dataKey: "payment_amount" },
  { title: "Status", dataKey: "list_status" },
  { title: "Actions", dataKey: "", restrictSorting: true },
];

export const linkOptions = [
  [
    {
      label: "Payment claim",
      routeLink: AppRoutes.USER_PAY_APPS,
      description: "Standard payment claim both receivable and billable",
    },
    {
      label: "Retention claim",
      routeLink: AppRoutes.USER_PAY_APPS,
      description: "Retention claim both receivable and billable",
    },
    {
      label: "Interest received",
      routeLink: `${AppRoutes.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT}?type=Interest Received`,
      description: "To record interest received from your bank",
    },
  ],
  [
    {
      label: "Interest withdrawal",
      routeLink: `${AppRoutes.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT}?type=Interest Withdrawal`,
      description: "To record withdrawal of interest from the bank account",
    },
    {
      label: "Bank charge applied",
      routeLink: `${AppRoutes.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT}?type=Bank Charge Applied`,
      description: "To record a bank charge",
    },
    {
      label: "Bank charge top up",
      routeLink: `${AppRoutes.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT}?type=Bank Charge Top Up`,
      description:
        "To record a top up of the bank account in order to satisfy bank charges having been withdrawn",
    },
  ],
  [
    {
      label: "Top up",
      routeLink: `${AppRoutes.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT}?type=Top Up`,
      description: "To top up the bank account",
    },
    {
      label: "Top up retention",
      routeLink: `${AppRoutes.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT}?type=Top Up Retention`,
      description: "To top up the retention bank account",
    },
    {
      label: "Withdrawal",
      routeLink: `${AppRoutes.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT}?type=Withdrawal`,
      description: "To withdraw from the bank account",
    },
  ],
  [
    {
      label: "Overpayment refund from supplier",
      routeLink: `${AppRoutes.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT}?type=Overpayment refund from supplier`,
      description:
        "To record an overpayment refund being paid from the supplier",
    },
    {
      label: "Overpayment refund to client",
      routeLink: `${AppRoutes.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT}?type=Overpayment refund to client`,
      description: "To record an overpayment refund being paid to the client",
    },
    {
      label: "Overpayment to supplier",
      routeLink: `${AppRoutes.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT}?type=Overpayment to supplier`,
      description:
        "To record where an overpayment has been made to the supplier",
    },
  ],
  [
    {
      label: "Overpayment from client",
      routeLink: `${AppRoutes.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT}?type=Overpayment from client`,
      description:
        "To record where an overpayment has been received from the client",
    },
    {
      label: "Underpayment to supplier",
      routeLink: `${AppRoutes.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT}?type=Underpayment to supplier`,
      description:
        "To record where an underpayment has been made to the supplier",
    },
    {
      label: "Underpayment from client",
      routeLink: `${AppRoutes.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT}?type=Underpayment from client`,
      description:
        "To record where an underpayment has been received from the client",
    },
  ],
];

export const paymentRenderData = [
  { key: "payment_date", typeOfDate: true },
  { key: "payment_type" },
  { key: "project_name" },
  { key: "contract_name" },
  { key: "payment_from_account_name" },
  { key: "payment_to_account_name" },
  { key: "payment_amount" },
  { key: "list_status", enableStatusIcons: true },
];
