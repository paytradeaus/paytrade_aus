import { DELETE, EDIT, PAYMENT, VIEW } from "@/shared/constant/general";

const bankAccountTypeOptions = [
  { value: "All", label: "All" },
  { value: "Retention Trust Account", label: "Retention Trust Account" },
  { value: "Project Trust Account", label: "Project Trust Account" },
  { value: "Cash Account", label: "Cash Account" },
];

const tabOptions = [{ label: "Current" }, { label: "Archived", value: null }];
const clientsTabOptions = [
  { value: "All", label: "All", id: [0] },
  { value: "Client", label: "Clients", id: [1] },
  { value: "Supplier", label: "Suppliers", id: [2] },
];

// Define headers dynamically
// const clientsAndSuppliersHeaders = [
//   "Name",
//   "Business Name",
//   "Client/Supplier",
//   "Address",
//   "Payment Claims",
//   "Contracts",
//   "Status",
// ];

const clientsAndSuppliersHeaders = [
  { title: "Name", dataKey: "client_supplier_name" },
  { title: "Business Name", dataKey: "business_name" },
  { title: "Client/Supplier", dataKey: "client_supplier_type" },
  { title: "Address", dataKey: "client_supplier_address" },
  { title: "Bank A/C", dataKey: "bank_account_count" },
  { title: "Payment Claims", dataKey: "claim_count" },
  { title: "Contracts", dataKey: "contract_count" },
  { title: "Status", dataKey: "client_supplier_status" },
  { title: "Actions", dataKey: "status", restrictSorting: true },
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
const paymentActions = [{ label: "Add Payment Claim", value: PAYMENT }];
const pdfHeaders = [
  "Name",
  "Business Name",
  "Client/Supplier",
  "Address",
  "Bank A/C",
  "Payment Claims",
  "Contracts",
  "Status",
];

const pdfDataRow = [
  "client_supplier_name",
  "business_name",
  "client_supplier_type",
  "client_supplier_address",
  "bank_account_count",
  "claim_count",
  "contract_count",
  "client_supplier_status",
  "status",
];

const clientAndSupplierRenderData = [
  { key: "client_supplier_name" },
  { key: "business_name" },
  { key: "client_supplier_type" },
  { key: "client_supplier_address" },
  { key: "bank_account_count", enableBankAccountIcons: true },
  { key: "claim_count" },
  { key: "contract_count" },
  { key: "client_supplier_status", enableStatusIcons: true },
];

const excelColumnNames = [
  { value: "client_supplier_name", label: "Name" },
  { value: "business_name", label: "Business Name" },
  { value: "client_supplier_type", label: "Client/Supplier" },
  { value: "client_supplier_address", label: "Address" },
  { value: "bank_account_count", label: "Bank A/C" },
  { value: "claim_count", label: "Payment Claims" },
  { value: "contract_count", label: "Contracts" },
  { value: "client_supplier_status", label: "Status" },
];

const tabId = {
  CLIENTS_AND_SUPPLIERS: "overview-clients-and-suppliers",
  PAYMENTS: "overview-payments",
  ACCOUNTS: "overview-accounts",
  VARIATIONS: "overview-variations",
};

export {
  bankAccountTypeOptions,
  tabOptions,
  clientsAndSuppliersHeaders,
  clientAndSupplierRenderData,
  excelColumnNames,
  pdfDataRow,
  pdfHeaders,
  currentListDraftActions,
  currentListActions,
  tabId,
  paymentActions,
  archiveActions,
  clientsTabOptions,
};
