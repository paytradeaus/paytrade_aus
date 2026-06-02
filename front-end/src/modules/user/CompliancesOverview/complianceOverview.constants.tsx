export const trustAccountRadioOptions = [
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

export const actionButtonType = {
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
  VIEW_PAYMENTS: "VIEW_PAYMENTS",
  VIEW_CLAIMS: "VIEW_CLAIMS",
  VIEW_CLAIMS_AND_PAYMENTS: "VIEW_CLAIMS_AND_PAYMENTS",
};

export const getButtonType = (buttonType: string) => {
  switch (buttonType) {
    case actionButtonType.ADD_BANK_ACCOUNT:
      return "Add Bank Account";
    case actionButtonType.ADD_CONTRACT:
      return "Add Contract";
    case actionButtonType.EDIT_BANK_ACCOUNT:
      return "Edit Bank Account";
    case actionButtonType.EDIT_CONTRACT:
      return "Go to Contract";
    case actionButtonType.EDIT_PROJECT:
      return "Edit Project";
    case actionButtonType.MATCH_TRANSACTIONS:
      return "Match Transactions";
    case actionButtonType.SEND_NOTICE:
      return "Send Notices";
    case actionButtonType.RECONCILIATION:
      return "Reconciliation";
    case actionButtonType.REVIEW_AUDIT:
      return "Review Audit";
    case actionButtonType.VIEW_UNMATCHED_PAYMENTS:
      return "View Unmatched Payments";
    case actionButtonType.SEND_SCHEDULE:
      return "Send Schedule";
    case actionButtonType.UPDATE_TRANSACTION_LIST:
      return "Update Transaction List";
    case actionButtonType.TOPUP_ACCOUNT:
      return "Top Up Account";
    case actionButtonType.SEND_REMITTANCE:
      return "Send Remittance";

    case actionButtonType.WITHDRAW_BALANCE:
      return "Withdraw Balance";
    case actionButtonType.UPDATE_AND_MATCH:
      return "Update and Match";
    case actionButtonType.PAY_NOW:
      return "Pay Now";
    case actionButtonType.DELEGATE_NOW:
      return "Delegate Now";
    case actionButtonType.UPLOAD_CERTIFICATE:
      return "Upload Certificate";
    case actionButtonType.VIEW_PAYMENTS:
      return "View Payments";
    case actionButtonType.VIEW_CLAIMS:
      return "View Claims";

    case actionButtonType.NONE:
      return "";
    default:
      return "";
  }
};

export const details = [
  {
    numberIconClass: "ni_green",
    number: 1,
    title:
      "CHECK CONTRACT ELIGIBILITY (Head Contractors And Related Entity Subcontractors Only)",
    description:
      "Use the trust account tool to determine whether a project trust is required.",
    eligibilityCriteria: [
      "You're a head contractor or a related entity subcontractor engaged by a contracting party applicable to current phase",
      "The contract price is as per the relevant phase",
      "More than 50 per cent of the contract price is for project trust work",
      "You are engaging one or more subcontractors",
    ],
    eligibilityCriteriaDescription: {
      beforeList: "Project trust account eligibility criteria:",
      afterList:
        "If all of the eligibility criteria is met (and no exemptions apply), you must use a project trust account for the project.",
    },
    statusText: "Project Trust Account Opened and linked",
    statusClass: "pt_green",
  },
  {
    numberIconClass: "ni_yellow",
    number: 2,
    title:
      "CHECK CONTRACT ELIGIBILITY (Head Contractors And Related Entity Subcontractors Only)",
    description:
      "Use the trust account tool to determine whether a project trust is required.",
    eligibilityCriteria: [
      "You're a head contractor or a related entity subcontractor engaged by a contracting party applicable to current phase",
      "The contract price is as per the relevant phase",
      "More than 50 per cent of the contract price is for project trust work",
      "You are engaging one or more subcontractors",
    ],
    eligibilityCriteriaDescription: {
      beforeList: "Project trust account eligibility criteria:",
      afterList:
        "If all of the eligibility criteria is met (and no exemptions apply), you must use a project trust account for the project.",
    },
    statusText: "Project Trust Account Opened and linked",
    statusClass: "pt_green",
  },
];
