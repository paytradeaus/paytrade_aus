const tabTypes = {
  RECEIVABLES: "Receivable",
  BILLABLES: "Billable",
  SUPPLIER: "Supplier",
  THIRD_PARTY: "3rd Party",
  FULL: "Full",
  PART: "Part",
  PAY_LESS_FULL: "Pay Less - Full",
  PAY_LESS_PART: "Pay Less - Part",
  PAY_LESS_ZERO: "Pay - Zero",
  RETENTION: "Retention",
  NO_RETENTION: "Payment",
};

const claimType = [
  {
    value: "Receivable",
    label: "Receivables",
  },
  {
    value: "Billable",
    label: "Billables",
  },
];

const retentionSwitchOptions = [
  {
    value: "Retention",
    label: "Retention",
  },
  {
    value: "Payment",
    label: "No Retention",
  },
];

const beneficiarySwitchOptions = [
  {
    value: "Full",
    label: "Full",
  },
  {
    value: "Part",
    label: "Part",
  },
];

const paymentTypeSwitchOptions = [
  ...beneficiarySwitchOptions,
  {
    value: "Pay Less - Full",
    label: "Pay Less - Full",
  },
  {
    value: "Pay Less - Part",
    label: "Pay Less - Part",
  },
  {
    value: "Pay - Zero",
    label: "Pay Less - Zero",
  },
];

const paymentToSwitchOptions = [
  {
    value: "Supplier",
    label: "Supplier",
  },
  {
    value: "3rd Party",
    label: "3rd Party",
  },
];

const retentionSwitchConfirmation = {
  noRetention:
    "This claim is linked to a contract with 'No retention' Do you still want to continue adding retention?",
  retention:
    "This claim is linked to a contract with 'cash retention' Do you still want to continue without retention?",
};

const contractRetentionType = {
  cash: "Cash",
  none: "None",
  bankGuaranteed: "Bank guaranteed",
};

const payRetentionWarningMessage = {
  partPayment:
    "The Total amount for a part payment must be less than the Claim amount",
  payLessOrFullPayment:
    "The Total amount for a pay less payment must be less than the Claim amount",
  paylessPart:
    "The Total amount for a pay less part payment must be less than or equal to the outstanding amount",
};

const s76ResponseReminderMessage =
  "This payment is less than the full claimed amount and the response deadline (the earlier of 15 business days after the claim was received, or the claim's due date) has passed. Under section 76 of the BIF Act you must give the claimant a payment schedule that states the amount you propose to pay and all reasons for paying less or withholding any amount. Recording this payment does not satisfy that obligation.";

const checkBoxConfirmationMessage =
  "Are you sure you wish to mark this payment as";
const checkBoxRTAConfirmationMessage =
  "Are you sure you wish to mark this retention payment to RTA as";

const paymentsNonEditableStatus = [
  "Paid - Matched",
  "Received - Matched",
  "Deleted",
  "No Match Required",
];

const routedFrom = {
  RETENTION_CLAIM_ONE: "retention-claim",
  RETENTION_CLAIM_TWO: "Retention claim",
};

const paymentsTransactionsTableHeaders = [
  {
    id: 1,
    name: "Payment Transaction Id",
  },
  {
    id: 5,
    name: "Payment Transaction Type",
  },
  {
    id: 2,
    name: "To Account Name",
  },
  {
    id: 3,
    name: "Payment Amount",
  },
  {
    id: 4,
    name: "Status",
  },
];

const matchedTransactionsTableHeaders = [
  {
    id: 1,
    name: "Date",
  },
  {
    id: 2,
    name: "Description",
  },
  {
    id: 3,
    name: "Spent",
  },
  {
    id: 4,
    name: "Received",
  },
];

const fileUploadType = {
  COMPULSORY_FILE_UPLOAD: "compulsoryFileUpload",
  OPTIONAL_FILE_UPLOAD: "optionalFileUpload",
};

export {
  tabTypes,
  claimType,
  retentionSwitchOptions,
  paymentTypeSwitchOptions,
  paymentToSwitchOptions,
  checkBoxRTAConfirmationMessage,
  retentionSwitchConfirmation,
  payRetentionWarningMessage,
  contractRetentionType,
  paymentsNonEditableStatus,
  routedFrom,
  beneficiarySwitchOptions,
  matchedTransactionsTableHeaders,
  paymentsTransactionsTableHeaders,
  fileUploadType,
  checkBoxConfirmationMessage,
  s76ResponseReminderMessage,
};
