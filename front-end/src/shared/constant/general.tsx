//input field types
const InputType = {
  TEXT_FIELD: "text",
  SELECT: "select",
  MULTI_SELECT: "multiSelect",
  CHECKBOX: "checkbox",
  RADIO_BUTTON: "radio",
  SWITCH: "switch",
  DATE_PICKER: "date",
  TIME_PICKER: "time",
  MONTH_YEAR_PICKER: "month",
  SEARCH: "search",
  TEXT_AREA: "textarea",
};

const CURRENCY = "$";

const buttonType = {
  PRIMARY: "primary",
  SECONDARY: "secondary",
  CONTRAST: "contrast",
  PRIMARY_OUTLINE: "outline",
  OUTLINE_SECONDARY: "outline secondary",
  OUTLINE_CONTRAST: "outline contrast",
  SMALL_BUTTON: "smallbutton",
  SECONDARY_SMALL: "secondary smallbutton",
  CONTRAST_SMALL: "contrast smallbutton",
};
function findSelectedOptions(options: any[], existingValue: string) {
  return options.find((x: any) => x?.value == existingValue) ?? null;
}
function getCurrentUtcTime() {
  return new Date().toISOString().replace("T", " ").split(".")[0] + " UTC";
}
const EMAIL_REGEX =
  /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;

const NUMBER_REGEX = /^[0-9]+$/;
const ALPHANUMERIC = /^[a-zA-Z0-9 ]+$/;
const ALPHANUMERIC_WITH_FRENCH_CHARACTERS = /^[a-zA-Z0-9\sÀ-Öà-ö]+$/;
const TabType = {
  switch: "switch",
  radioSwitch: "radioSwitch",
};
const TWO_DECIMAL_DIGITS_WITH_ONE_OPTIONAL = /^\d{1}\d?$/;

const ADD = "add";
const ADDC = "Add";
const EDIT = "edit";
const EDITC = "Edit";
const VIEW = "view";
const DELETE = "Delete";
const COMPLETED = "Completed";
const PAYMENT = "Add Payment Claim";
const VIEW_ARCHIVE = "view-archive";

const applicationStorage = {
  THEME: "theme",
  USER_COMPANY_ID: "companyId",
  COMPANY_ID: "companyId",
  NAVIGATED_FROM: "navigated-from",
};

const footerDivisions = {
  PRIVACY_POLICY: "privacy_policy",
  TERMS_CONDITIONS: "termsAndConditions",
  COOKIE_POLICY: "cookiePolicy",
  SECURITY: "security",
};

const DateFormat = {
  DD_MM_YYYY: "dd-MM-yyyy",
  MM_DD_YYYY: "MM/dd/yyyy",
  YYYY_MM_DD: "yyyy-MM-dd",
  MOMEMT_YYYY_MM_DD: "YYYY-MM-DD",
  MM_YYYY: "MM/yyyy",
  DD_MM_YYYY_SLASH: "dd/MM/yyyy",
};

const NA = "N/A";
const currencySymbol = "$";

const tabOptions = [
  { label: "Current", value: "" },
  { label: "Archived", value: "Archived" },
];

export const filterByDuration = [
  {
    label: "All dates",
    value: "All dates",
  },
  { value: "Custom", label: "Custom" },
  { value: "Last Month", label: "Last month" },
];

export const filterByDurationDates = [
  {
    label: "All dates",
    value: "All dates",
  },
  { value: "Custom", label: "Custom" },
  { value: "Last Month", label: "Last month" },
  { value: "This Month", label: "This month" },
];

const QUICK_ADD_RECORD_VALUE = "quickAddRecord";

const quickAddRoutes = {
  CLIENT_SUPPLIER: "client/supplier",
  CLIENT: "client",
  CONTRACT: "contract",
  PROJECT: "project",
  CLAIMS: "claims",
  RETRIEVE_AUDIT: "audit",
  SUPPLIER: "supplier",
  PTA_RTA_ACCOUNT: "ptaRtaAcc",
  PTA_ACCOUNT: "ptaAcc",
  RTA_ACCOUNT: "rtaAcc",
  BANK_ACCOUNT: "bank-acc",
  RETRIEVE_VARIATION: "variation",
  RETRIEVE_CLAIMS: "claims",
  RETRIEVE_CONTRACT: "contract",
  RETRIEVE_RECONCILIATION: "reconciliation",
  RETRIEVE_INTEREST_AND_CHARGES: "interestAndCharges",
  BANK_STATEMENT: "bank-statement",
};

const UploadImage = {
  jpegAndPng: ["image/jpeg", "image/png"],
  twoMB: 2 * 1024 * 1024,
};

const uploadFile = {
  pdf: "application/pdf",
  word: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  fiveMB: 5 * 1024,
};

const imageTypeFormats = [
  "image/jpeg",
  "image/png",
  "image/x-png",
  "image/gif",
  "image/jpg",
  "image/gif",
  ".jpeg",
  ".png",
  ".gif",
  ".tiff",
  ".bmp",
];

const fileTypeFormats = [
  ".doc",
  ".docx",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".pdf",
  ".txt",
  ".csv",
  ".xls",
  ".ppt",
  ".zip",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/csv",
  "text/plain",
];

const SubscriptionPlanType = {
  BASIC: "Basic",
};
const SUBSCRIPTION_UPGRADE =
  "If you wish Pay Trade to submit your notices automatically to the QBCC, please upgrade your subscription.";

const DEBOUNCE_TIMER = 700;

const OVERVIEW_TABS = {
  project: "projectOverview",
  contract: "contracts",
};

const PAYMENT_TYPES = [
  "Full",
  "Part",
  "Pay Less - Full",
  "Pay Less - Part",
  "Pay - Zero",
  "3rd Party",
];

export {
  NA,
  InputType,
  buttonType,
  TabType,
  applicationStorage,
  imageTypeFormats,
  fileTypeFormats,
  ADD,
  EDIT,
  VIEW,
  DELETE,
  EDITC,
  ADDC,
  VIEW_ARCHIVE,
  footerDivisions,
  EMAIL_REGEX,
  NUMBER_REGEX,
  DateFormat,
  currencySymbol,
  COMPLETED,
  PAYMENT,
  findSelectedOptions,
  getCurrentUtcTime,
  tabOptions,
  ALPHANUMERIC_WITH_FRENCH_CHARACTERS,
  UploadImage,
  ALPHANUMERIC,
  uploadFile,
  CURRENCY,
  SubscriptionPlanType,
  SUBSCRIPTION_UPGRADE,
  TWO_DECIMAL_DIGITS_WITH_ONE_OPTIONAL,
  DEBOUNCE_TIMER,
  OVERVIEW_TABS,
  PAYMENT_TYPES,
  QUICK_ADD_RECORD_VALUE,
  quickAddRoutes,
};
