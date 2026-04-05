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
  { value: "Cash Account", label: "Cash Account" },
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
    title: "Client/Supplier Name",
    dataKey: "account_name",
    restrictSorting: true,
  },
  {
    title: "Number",
    dataKey: "account_number",
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
    title: "Client/Supplier Name",
    dataKey: "account_name",
    restrictSorting: true,
  },
  {
    title: "Number",
    dataKey: "account_number",
    restrictSorting: true,
  },
  { title: "Edit", restrictSorting: true, alignCenter: true },
  { title: "Delete", restrictSorting: true, alignCenter: true },
];

const trustTrainingRenderData = (isViewMode: any) => {
  return [
    { key: "account_type", trim: isViewMode ? 30 : 25 },
    { key: "account_name", trim: isViewMode ? 50 : 25 },
    { key: "account_number", trim: 25 },
  ];
};

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
};
