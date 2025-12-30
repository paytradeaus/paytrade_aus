import { EDIT, DELETE, VIEW } from "@/common/constants/general";

const clientAndSupplierOptions = [
  {
    value: "Client",
    label: "Client",
  },
  {
    value: "Supplier",
    label: "Supplier",
  },
];
const relatedEntityOptions = [
  {
    label: "No",
    value: "No",
  },
  {
    label: "Yes",
    value: "Yes",
  },
];
const entityTypeOptions = [
  {
    label: "Business",
    value: "Business",
  },

  {
    label: "Personal",
    value: "Personal",
  },
  {
    label: "Sole Trader",
    value: "Sole Trader",
  },
];
const clientSupplierStatus = [
  {
    label: "Draft",
    value: "Draft",
  },
  {
    label: "Completed",
    value: "Completed",
  },
];

const toggleOptions = [
  { value: "All", label: "All" },
  { value: "Client", label: "Clients" },
  { value: "Supplier", label: "Suppliers" },
];

const currentListActions = [
  { label: "View", value: VIEW },
  { label: "Edit", value: EDIT },
  {
    label: "Add Payment Claim",
    value: "Add Payment Claim",
  },
  { label: DELETE, value: DELETE, isDelete: true },
];

const currentListDraftActions = [
  { label: "View", value: VIEW },
  { label: "Edit", value: EDIT },
  { label: DELETE, value: DELETE, isDelete: true },
];
const archiveActions = [
  { label: "View", value: VIEW },
  { label: "Undo Delete", value: "Undo Delete", isDelete: true },
];
const accountTypeOptions = [
  {
    value: "Cash Account",
    label: "Cash Account",
  },
  {
    value: "Project Trust Account",
    label: "Project Trust Account",
  },
  {
    value: "Retention Trust Account",
    label: "Retention Trust Account",
  },
];

const tabOptions = [
  {
    id: "Current Projects",
    label: "Current",
    hasError: false,
  },
  {
    id: "Archived Projects",
    label: "Archived",
    hasError: false,
  },
];

export {
  tabOptions,
  toggleOptions,
  currentListActions,
  archiveActions,
  clientAndSupplierOptions,
  relatedEntityOptions,
  entityTypeOptions,
  clientSupplierStatus,
  accountTypeOptions,
  currentListDraftActions,
};
