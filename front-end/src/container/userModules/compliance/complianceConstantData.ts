const dropdownAllOption = { label: "All", value: null };
const complianceDateOptions = [
  { value: null, label: "All dates" },
  { value: "Last Month", label: "Last Month" },
  { value: "Custom", label: "Custom" },
];
const accountTypes = [
  dropdownAllOption,
  { value: "Project Trust Account", label: "Project Trust Account" },
  { value: "Retention Trust Account", label: "Retention Trust Account" },
];

const trustAccountRadioOptions = [
  {
    value: "Project Trust Account",
    label: "Project Trust Account",
    hasError: false,
  },
  {
    value: "Retention Trust Account",
    label: "Retention Trust Account",
    hasError: true,
  },
];

const actionButtonType = {
  ADD_BANK_ACCOUNT: "ADD_BANK_ACCOUNT",
  EDIT_BANK_ACCOUNT: "EDIT_BANK_ACCOUNT",
  ADD_CONTRACT: "ADD_CONTRACT",
  EDIT_CONTRACT: "EDIT_CONTRACT",
  EDIT_PROJECT: "EDIT_PROJECT",
  MATCH_TRANSACTIONS: "MATCH_TRANSACTIONS",
  SEND_NOTICE: "SEND_NOTICE",
  RECONCILIATION: "RECONCILE",
  REVIEW_AUDIT: "REVIEW_AUDIT", //ANNUAL ACCOUNT REVIEW REPORTS
  VIEW_UNMATCHED_PAYMENTS: "VIEW_UNMATCHED_PAYMENTS", //PAYMENTS FROM THE PRINCIPAL
  SEND_SCHEDULE: "SEND_SCHEDULE", //PAYMENTS TO SUBCONTRACTORS
  UPDATE_TRANSACTION_LIST: "UPDATE_TRANSACTION_LIST", //PAYMENTS TO SUBCONTRACTORS
  TOPUP_ACCOUNT: "TOPUP_ACCOUNT", //PAYMENTS TO SUBCONTRACTORS
  SEND_REMITTANCE: "SEND_REMITTANCE", //PAYMENTS TO SUBCONTRACTORS
  WITHDRAW_BALANCE: "WITHDRAW_BALANCE", //PAYMENTS TO YOURSELF AS TRUSTEE
  UPDATE_AND_MATCH: "UPDATE_AND_MATCH", //WITHHOLDING RETENTIONS
  PAY_NOW: "PAY_NOW", //RELEASING RETENTION AMOUNTS TO YOURSELF AS TRUSTEE
  DELEGATE_NOW: "DELEGATE_NOW",
  UPLOAD_CERTIFICATE: "UPLOAD_CERTIFICATE",
  NONE: "NONE",
};

export {
  dropdownAllOption,
  complianceDateOptions,
  accountTypes,
  trustAccountRadioOptions,
  actionButtonType,
};
