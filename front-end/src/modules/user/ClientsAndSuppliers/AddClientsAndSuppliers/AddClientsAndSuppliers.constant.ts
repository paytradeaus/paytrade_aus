const entityType = [
  {
    label: "Business",
    value: "Business",
  },
  {
    label: "Sole Trader",
    value: "Sole Trader",
  },
  {
    label: "Personal",
    value: "Personal",
  },
  {
    label: "Partnership",
    value: "Partnership",
  },
];
const relatedEntityTypeOptions = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
];
const statusTypeOptions = [
  { value: "Draft", label: "Draft" },
  { value: "Completed", label: "Completed" },
];
const accountTypeOptions = [
  { value: "Cash Account", label: "General Account" },
  { value: "Project Trust Account", label: "Project Trust Account" },
  { value: "Retention Trust Account", label: "Retention Trust Account" },
];
const clientSupplierTypeOptions = [
  { value: "Client", label: "Client" },
  { value: "Supplier", label: "Supplier" },
];
const trustTrainingGridHeaders = [
  {
    title: "Account Type",
    dataKey: "account_type",
    restrictSorting: true,
  },
  {
    title: "Account Number",
    dataKey: "account_number",
    restrictSorting: true,
  },
  {
    title: "BSB Number",
    dataKey: "bsb_number",
    restrictSorting: true,
  },
];

const OverallTrustTrainingGridHeaders = [
  {
    title: "Account Type",
    dataKey: "account_type",
    restrictSorting: true,
  },
  {
    title: "Account Number",
    dataKey: "account_number",
    restrictSorting: true,
  },
  {
    title: "BSB Number",
    dataKey: "bsb_number",
    restrictSorting: true,
  },
  { title: "", restrictSorting: true, alignCenter: true },
];

const trustTrainingRenderData = (isViewMode: any) => {
  return [
    { key: "account_type", trim: isViewMode ? 30 : 25 },
    { key: "account_number", trim: isViewMode ? 50 : 25 },
    { key: "bsb_number", trim: 25 },
  ];
};

// Phase 2 — per-contact Xero GST tax-type options for AU. Values are
// the canonical Xero TaxType *codes* (the same enum the rest of the
// PayTrade backend stores and forwards to Xero). The first option
// (empty value) means "use Xero org default", which the backend
// resolver will fall through to.
const xeroGstTypeOptions = [
  { value: "", label: "Use organisation settings (default)" },
  { value: "BASEXCLUDED", label: "BAS Excluded" },
  { value: "EXEMPTEXPENSES", label: "GST Free Expenses" },
  { value: "EXEMPTOUTPUT", label: "GST Free Income" },
  { value: "INPUT", label: "GST on Expenses" },
  { value: "GSTONIMPORTS", label: "GST on Imports" },
  { value: "OUTPUT", label: "GST on Income" },
  { value: "INPUTTAXED", label: "Input Taxed" },
];

const queryParamsData = {
  CLIENT: "client",
  SUPPLIER: "supplier",
};

export {
  entityType,
  trustTrainingGridHeaders,
  trustTrainingRenderData,
  relatedEntityTypeOptions,
  statusTypeOptions,
  clientSupplierTypeOptions,
  accountTypeOptions,
  queryParamsData,
  OverallTrustTrainingGridHeaders,
  xeroGstTypeOptions,
};
