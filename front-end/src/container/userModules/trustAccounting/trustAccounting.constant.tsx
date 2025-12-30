import { DELETE, EDIT, VIEW } from "@/common/constants/general";

const tabId = {
  CLIENTS_AND_SUPPLIERS: "overview-clients-and-suppliers",
  PAYMENTS: "overview-payments",
};

const tabs = [
  { id: "Journals", label: "Journals", hasError: false },
  { id: "Account Ledger", label: "Account Ledger", hasError: true },

  {
    id: "Trial Balance Statement",
    label: "Trial Balance Statement",
    hasError: true,
  },
  {
    id: "Deposits and Withdrawals Report",
    label: "Deposits and Withdrawals Report",
    hasError: true,
  },
  {
    id: "Reconciliation Record",
    label: "Reconciliation Record",
    hasError: true,
  },
  { id: "Audit", label: "Audit", hasError: true },
];

const clientSuppliersListActions = [
  { label: "View", value: "View" },
  { label: "Edit", value: EDIT },
  { label: DELETE, value: DELETE, isDelete: true },
];

export { tabId, tabs, clientSuppliersListActions };
