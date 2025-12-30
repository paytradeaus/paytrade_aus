const getTooltipMessage = (label: any) => {
  switch (label) {
    case "Full-Payment":
      return "Where you intend to pay the full claim in full.";
    case "Part-Payment":
      return "Where you intend to pay the claim in full, but due to available funds, will need to pay part now and part later. You will be required to notify the QBCC where this is the case.";
    case "Pay Less - Full":
      return "Where you intend to pay less due to part completed work or other reduced payment reason. You will be required to confirm the reasons why and input the reduced payment amount.";
    case "Pay Less - Part":
      return "Where you intend to pay less due to part completed work or other reduced payment reason and due to available funds, will need to pay part now and part later. You will be required to notify the QBCC where this is the case.";
    case "Pay - Zero":
      return "Where you don’t intend to pay anything to settle the claim. This may be due to a claim error. You will be required to confirm to the sub-contractor the reason why.";
    case "Pay 3rd Party":
      return "Where you intend to pay a third party.";
    default:
      return "Select a payment method";
  }
};

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
export interface FileUploadResponseData {
  attachment_type: string;
  file_path: string;
  file_type: string;
  id: string;
}
export interface ProjectOption {
  value: string;
  label: string;
  project_id: number;
}
export interface ContractOption {
  value: string;
  label: string;
  contract_id: number;
  payment_terms: any;
}

export interface RowError {
  description?: string;
  quantity?: string;
  price?: string;
}

const customStyles = {
  control: () => ({
    height: "40px",
    width: "100%",
  }),
};

const ClientSupplierBankDetails: any = {
  Supplier: "client_supplier_name",
  Client: "client_supplier_name",
  Address: "client_supplier_address",
  ReceivedDate: "",
  SentDate: "",
  DueDate: "",
  ClaimReference: "",
  Memo: "",
  PaymentToAccount: "payment_to_account_type",
  PaymentFromAccount: "payment_from_account_type",
  PaymentToAccountName: "payment_to_account_name",
  PaymentToBSB: "payment_to_account_bsb_number",
  PaymentToAccountNumber: "payment_to_account_number",
  PaymentFromAccountName: "payment_from_account_name",
  PaymentFromBSB: "payment_from_account_bsb_number",
  PaymentFromAccountNumber: "payment_from_account_number",
};

const formikInitialValues = {
  ProjectId: "",
  ContractId: "",
  PaymentTerms: "",
  Supplier: "",
  Address: "",
  ReceivedDate: "",
  SentDate: "",
  DueDate: "",
  ClaimReference: "",
  Memo: "",
  PaymentToAccount: "",
  PaymentFromAccount: "",
  PaymentToAccountName: "",
  PaymentToBSB: "",
  PaymentToAccountNumber: "",
};

const initialUserData = {
  type: "",
  description: "",
  quantity: "",
  price: "",
  gst: "",
  amount: "",
};

export {
  getTooltipMessage,
  customStyles,
  ClientSupplierBankDetails,
  formikInitialValues,
  initialUserData,
};
