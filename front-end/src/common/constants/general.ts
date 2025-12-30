const PAY_TRADE_UK_SITE = "https://www.paytrade.app/uk/";

const DD_MM_YYYY = "dd/MM/yyyy";
const MM_DD_YYYY = "MM/dd/yyyy";
const YYYY_MM_DD = "YYYY-MM-DD";
const MM_YYYY = "MM/yyyy";

const ADD = "add";
const EDIT = "edit";
const VIEW = "view";
const DELETE = "Delete";
const VIEW_ARCHIVE = "view-archive";

//Regular expressions
const EMAIL_REGEX =
  /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;

const NUMBER_REGEX = /^[0-9]+$/;

const NO_DATA_PLACEHOLDER = "";
const ALPHANUMERIC = /^[a-zA-Z0-9 ]+$/;
const ALPHANUMERIC_WITH_FRENCH_CHARACTERS = /^[a-zA-Z0-9\sÀ-Öà-ö]+$/;
const DECIMAL_WITH_TWO_DIGITS = /^\d*\.?\d{0,2}$/;
const DECIMAL_WITH_PLUS_MINUS = /^[\+-]?\d*\.?\d{0,2}$/;
const DECIMAL_WITH_DOLLAR = /^(\$ )?([+\-]?\d{0,11}(?:\.\d{0,2})?)$/;
const DECIMAL_WITH_DOLLAR_ONLY = /^(\$ )?\d*\.?\d{0,2}$/;
const CURRENCY_SYMBOL = "$";
const DEBOUNCE_TIMER = 700;
const TWO_DIGITS_WITH_ONE_OPTIONAL = /^\d{1}\d?$/;

const commonCookies = {
  NAVIGATED_FROM: "navigated-from",
};

const SubscriptionPlanTypes = {
  BASIC: "Basic",
};

export {
  YYYY_MM_DD,
  VIEW_ARCHIVE,
  DECIMAL_WITH_DOLLAR,
  DECIMAL_WITH_PLUS_MINUS,
  DECIMAL_WITH_TWO_DIGITS,
  DECIMAL_WITH_DOLLAR_ONLY,
  PAY_TRADE_UK_SITE,
  NO_DATA_PLACEHOLDER,
  ALPHANUMERIC,
  DD_MM_YYYY,
  EMAIL_REGEX,
  MM_DD_YYYY,
  ADD,
  EDIT,
  NUMBER_REGEX,
  VIEW,
  DELETE,
  CURRENCY_SYMBOL,
  ALPHANUMERIC_WITH_FRENCH_CHARACTERS,
  MM_YYYY,
  DEBOUNCE_TIMER,
  TWO_DIGITS_WITH_ONE_OPTIONAL,
  commonCookies,
  SubscriptionPlanTypes,
};
// Arrays of file type formats

// Images
//["JPEG", "PNG", "GIF", "BMP", "TIFF", "image/png"];
export const imageTypeFormats = [
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

// PDFs
// ["PDF", "application/pdf"];
export const fileTypeFormats = [
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
export const onlyDOCandPDF = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
export const onlyCSV = [".csv"];

export const onlyPDFFiles = ["application/pdf"];

export const FILES_FORMAT_STRING =
  ".doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.txt,.csv,.xls,.ppt,.zip";

export const IMAGE_FORMAT_STRING =
  "image/jpeg, image/png, image/x-png,image/gif,image/jpg, image/gif, .jpeg, .png, .gif, .tiff, .bmp";
//removing HTML tags form the content
export const stripHtml = (html: any) => {
  let doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
};
