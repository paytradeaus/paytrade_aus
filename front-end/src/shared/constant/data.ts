//used for country selection dropdowns
const CountryList = {
  AUSTRALIA: 61,
  UNITED_KINGDOM: 44,
};

const AccountType = {
  CASH_ACCOUNT: "Cash Account",
  PROJECT_TRUST_ACCOUNT: "Project Trust Account",
  RETENTION_TRUST_ACCOUNT: "Retention Trust Account",
};

const ACCOUNT_TYPE_DISPLAY_LABELS: Record<string, string> = {
  "Cash Account": "General Account",
};

const getAccountTypeLabel = (value?: string | null): string => {
  if (!value) return "";
  return ACCOUNT_TYPE_DISPLAY_LABELS[value] || value;
};

const filterByDuration = [
  {
    label: "All",
    value: null,
  },
  { value: "Custom", label: "Custom" },
  { value: "Last Month", label: "Last month" },
];

//site link on selection of uk option in country dropdown
const PAY_TRADE_UK_SITE = "https://www.paytrade.app/uk/";

const listTabOptions = [
  { label: "Current" },
  { label: "Archived", value: null },
];

const ABOUT_SECTION_FOOTER_CONTENT =
  "QBCC Compliant Trust & Accounting Software Built for the Australian Construction Industry. Our simple trust account administration software helps you to implement and administer the QBCC regulatory requirements for project and retention trust accounts.";

const ACKNOWLEDGEMENT_OF_COUNTRY =
  "We acknowledge the Traditional Owners of the land on which we work and live, and recognise their continuing connection to land, water and community. We pay respect to Elders past, present and emerging.";

const subscriptionColorCodes = {
  RED: "#e23b30",
  YELLOW: "rgb(207, 173, 80)",
  WHITE: "#DCE3EC",
  BLACK: "black",
};

const subscriptionPlanFeatures = [
  {
    name: "",
    basicText: "Free",
    basicColorCode: subscriptionColorCodes.WHITE,
    standardText: "$100/yr",
    standardColorCode: subscriptionColorCodes.WHITE,
    advancedText: "$500/yr",
    advancedColorCode: subscriptionColorCodes.WHITE,
    proAuditText: "$1000/yr",
    proAuditColorCode: subscriptionColorCodes.WHITE,
  },
  {
    name: "Users",
    basicText: "1",
    basicColorCode: subscriptionColorCodes.RED,
    standardText: "5",
    standardColorCode: subscriptionColorCodes.YELLOW,
    advancedText: "Unlimited",
    proAuditText: "Unlimited",
  },

  {
    name: "Projects",
    basicText: "1",
    basicColorCode: subscriptionColorCodes.RED,
    standardText: "1",
    standardColorCode: subscriptionColorCodes.RED,
    advanced: true,
    advancedText: "10",
    proAuditText: "Unlimited",
  },
  {
    name: "Trusts",
    basicText: "2",
    basicColorCode: subscriptionColorCodes.YELLOW,
    standardText: "2",
    standardColorCode: subscriptionColorCodes.YELLOW,
    advancedText: "10",
    proAuditText: "Unlimited",
  },

  {
    name: "Trust 7 year history",
    basicText: "2",
    basicColorCode: subscriptionColorCodes.YELLOW,
    standardText: "2",
    standardColorCode: subscriptionColorCodes.YELLOW,
    advancedText: "10",
    proAuditText: "Unlimited",
  },

  {
    name: "Principals",
    basic: true,
    standard: true,
    advanced: true,
    proAudit: true,
  },
  {
    name: "Head Contractors",
    basic: true,
    standard: true,
    advanced: true,
    proAudit: true,
  },
  {
    name: "Sub Contracts",
    basic: true,
    standard: true,
    advanced: true,
    proAudit: true,
  },
  {
    name: "Notices",
    basicText: "Manual",
    basicColorCode: subscriptionColorCodes.RED,
    standardText: "Automated",
    advancedText: "Automated",
    proAuditText: "Automated",
  },
  {
    name: "ABA Generation",
    basic: false,
    standard: true,
    advanced: true,
    proAudit: true,
  },
  {
    name: "Bank Feeds",
    basic: false,
    standardText: "Coming soon",
    advancedText: "Coming soon",
    proAuditText: "Coming soon",
  },
  {
    name: "Delegate authority",
    basic: false,
    standard: false,
    advanced: true,
    proAudit: true,
  },

  {
    name: "Xero Integration",
    basic: false,
    standard: false,
    advanced: true,
    proAudit: true,
  },
  {
    name: "Onboarding support",
    basic: false,
    standard: false,
    advancedText: "1 hour",
    advancedColorCode: subscriptionColorCodes.YELLOW,
    proAuditText: "3 hours",
  },
  {
    name: "Audit export",
    basic: false,
    standard: false,
    advanced: false,
    proAudit: true,
  },
  {
    name: "Trust account records",
    basic: true,
    standard: true,
    advanced: true,
    proAudit: true,
  },
  {
    name: "Community",
    basic: true,
    standard: true,
    advanced: true,
    proAudit: true,
  },
  {
    name: "Eligibility checks",
    basic: true,
    standard: true,
    advanced: true,
    proAudit: true,
  },
  {
    name: "Account opening",
    basic: true,
    standard: true,
    advanced: true,
    proAudit: true,
  },
  {
    name: "Progress claim",
    basic: true,
    standard: true,
    advanced: true,
    proAudit: true,
  },

  {
    name: "Payment schedule",
    basic: true,
    standard: true,
    advanced: true,
    proAudit: true,
  },
  {
    name: "Compliance monitoring",
    basic: true,
    standard: true,
    advanced: true,
    proAudit: true,
  },
  {
    name: "Retention record",
    basic: true,
    standard: true,
    advanced: true,
    proAudit: true,
  },

  {
    name: "Notice management",
    basic: true,
    standard: true,
    advanced: true,
    proAudit: true,
  },
  {
    name: "Contract management",
    basic: true,
    standard: true,
    advanced: true,
    proAudit: true,
  },
  {
    name: "Accountant access",
    basic: true,
    standard: true,
    advanced: true,
    proAudit: true,
  },
];

export {
  CountryList,
  PAY_TRADE_UK_SITE,
  AccountType,
  getAccountTypeLabel,
  filterByDuration,
  listTabOptions,
  ABOUT_SECTION_FOOTER_CONTENT,
  ACKNOWLEDGEMENT_OF_COUNTRY,
  subscriptionPlanFeatures,
  subscriptionColorCodes,
};
