const typesOfClaims = [
  {
    label: "Claim",
    value: "Claim",
  },
  {
    label: "Retention Claim",
    value: "Retention claim",
  },
];

const paymentTypes = [
  {
    label: "Billable",
    value: "Billable",
  },
  {
    label: "Receivable",
    value: "Receivable",
  },
];

const ClientSupplierBankDetails: any = {
  supplier: "client_supplier_name",
  client: "client_supplier_name",
  address: "client_supplier_address",
  receivedDate: "",
  sentDate: "",
  dueDate: "",
  claimReference: "",
  memo: "",
  paymentToAccount: "payment_to_account_type",
  paymentFromAccount: "payment_from_account_type",
  paymentToAccountName: "payment_to_account_name",
  paymentToBSB: "payment_to_account_bsb_number",
  paymentToAccountNumber: "payment_to_account_number",
  paymentFromAccountName: "payment_from_account_name",
  paymentFromBSB: "payment_from_account_bsb_number",
  paymentFromAccountNumber: "payment_from_account_number",
  paymentTerms: "payment_terms",
};

const AttachmentTypes = {
  COMPULSORY: "compulsoryAttachment",
  OPTIONAL: "optionalAttachment",
  OTHER_OPTIONAL: "otherOptionalAttachment",
};

const noticesHeader = [
  { title: "Notice Type", restrictSorting: true },
  { title: "Date", restrictSorting: true },
  { title: "Status", restrictSorting: true },
  { title: "View", restrictSorting: true },
];

const noticesRenderData = [
  { key: "notice_type" },
  { key: "notice_date", typeOfDate: true },
  { key: "status" },
];

export type UserData = {
  type: string;
  description: string;
  quantity: string;
  price: string;
  gst: string;
  amount: string;
} & {
  [key: string]: string | boolean; // Allow other properties to be string or boolean
};

export interface ContractOption {
  value: string;
  label: string;
  contract_id: number;
  payment_terms: any;
  contract_billing_type?: string;
}

const SubscriptionPlanTypes = {
  BASIC: "Basic",
};

const ClientSupplierToBankDetails: any = {
  paymentToAccountName: "payment_to_account_name",
  paymentToBSB: "payment_to_account_bsb_number",
  paymentToAccountNumber: "payment_to_account_number",
};

const retentionRadioOption = [
  {
    label: "Retention",
    value: "Retention",
  },
  {
    label: "No Retention",
    value: "No Retention",
  },
];

const GridListHeaders = [
  { title: "Claim id", dataKey: "payment_claim_id" },
  { title: "Client name", dataKey: "client_supplier_name" },
  { title: "Amount unpaid", dataKey: "unpaid_amount_sort" },
  { title: "Reason", dataKey: "user_input" },
];

export {
  typesOfClaims,
  GridListHeaders,
  paymentTypes,
  ClientSupplierBankDetails,
  AttachmentTypes,
  SubscriptionPlanTypes,
  noticesHeader,
  noticesRenderData,
  ClientSupplierToBankDetails,
  retentionRadioOption,
};
