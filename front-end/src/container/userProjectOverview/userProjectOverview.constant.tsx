import { DELETE, EDIT } from "@/common/constants/general";

const tabId = {
  CLIENTS_AND_SUPPLIERS: "overview-clients-and-suppliers",
  PAYMENTS: "overview-payments",
  ACCOUNTS: "overview-accounts",
  VARIATIONS: "overview-variations",
};

const tabs = [
  { id: "contracts", label: "Contracts", hasError: false },
  { id: "Claims", label: "Claims", hasError: true },
  { id: tabId.PAYMENTS, label: "Payments", hasError: true },
  {
    id: tabId.CLIENTS_AND_SUPPLIERS,
    label: "Clients & Suppliers",
    hasError: true,
  },
  { id: tabId.VARIATIONS, label: "Variations", hasError: true },
  { id: tabId.ACCOUNTS, label: "Accounts", hasError: true },
  { id: "Retentions", label: "Retentions", hasError: true },
  { id: "Notices", label: "Notices", hasError: true },
  { id: "Journals", label: "Journals", hasError: true },
  { id: "Compliance", label: "Compliance", hasError: true },
];

const clientSuppliersListActions = [
  { label: "View", value: "View" },
  { label: "Edit", value: EDIT },
  { label: DELETE, value: DELETE, isDelete: true },
];

export { tabId, tabs, clientSuppliersListActions };
