import React from "react";

export const listTabOptions = [
  { label: "Current" },
  { label: "Archived", value: null },
];

export const integrationListHeaders = [
  { dataKey: "integration_name", title: "Integration" },
  { dataKey: "integration_date", title: "Date Added" },
  { dataKey: "integration_type", title: "Type" },
  { dataKey: "integration_status", title: "Status" },
  { dataKey: "", title: "Actions", restrictSorting: true },
];

export const integrationListRenderData = [
  { key: "integration_name" },
  { key: "integration_date" },
  { key: "integration_type" },
  { key: "integration_status" },
];

export const xeroSyncListHeaders = [
  { dataKey: "sync_status", title: "Status" },
  { dataKey: "sync_type", title: "Type" },
  { dataKey: "reference", title: "Reference" },
  { dataKey: "description", title: "Message" },
  { dataKey: "system", title: "System" },
  { dataKey: "project", title: "Project" },
  { dataKey: "started", title: "Started" },
  { dataKey: "", title: "View", restrictSorting: true },
];

export const xeroSynListRenderData = [
  { key: "sync_status" },
  { key: "sync_type" },
  { key: "reference" },
  { key: "description" },
  { key: "process" },
  { key: "project_name" },
  { key: "started" },
];

export const contactsTabOptions = [
  { label: "Mapped contacts" },
  { label: "Paytrade contacts" },
  { label: "Xero contacts" },
];
export const projectsTabOptions = [
  { label: "Mapped projects" },
  { label: "Paytrade projects" },
  { label: "Xero projects" },
];
export const contractsTabOptions = [
  { label: "Mapped contracts" },
  { label: "Paytrade contracts" },
  { label: "Xero contracts" },
];

export const bankAccountsTabOptions = [
  { label: "Mapped bank accounts" },
  { label: "Paytrade bank accounts" },
  { label: "Xero bank accounts" },
];

export const billsTabOptions = [
  { label: "Mapped bills" },
  { label: "Paytrade bills" },
  { label: "Xero bills" },
];

export const invoicesTabOptions = [
  { label: "Mapped invoices" },
  { label: "Paytrade invoices" },
  { label: "Xero invoices" },
];

export const paymentsTabOptions = [
  { label: "Mapped payments" },
  { label: "Paytrade payments" },
  { label: "Xero payments" },
];

export const paytradeContactsHeaders = [
  { dataKey: "contact_name", title: "Name" },
  { dataKey: "mapped_status", title: "Status" },
  { dataKey: "", title: "Actions", restrictSorting: true },
];

export const paytradeProjectsHeaders = [
  { dataKey: "project_name", title: "Name" },
  { dataKey: "mapped_status", title: "Status" },
  { dataKey: "", title: "Actions", restrictSorting: true },
];

export const paytradeContractsHeaders = [
  { dataKey: "contract_name", title: "Name" },
  { dataKey: "mapped_status", title: "Status" },
  { dataKey: "", title: "Actions", restrictSorting: true },
];

export const paytradeBankAccountsHeaders = [
  { dataKey: "account_name", title: "Name" },
  { dataKey: "mapped_status", title: "Status" },
  { dataKey: "", title: "Actions", restrictSorting: true },
];

export const paytradeBillsHeaders = [
  { dataKey: "invoice_id", title: "Id" },
  { dataKey: "type", title: "Type" },
  { dataKey: "total_amount", title: "Total amount" },
  { dataKey: "due_date", title: "Due Date" },
  { dataKey: "contact_name", title: "Contact" },
  { dataKey: "mapped_status", title: "Status" },
  { dataKey: "", title: "Actions", restrictSorting: true },
];

export const paytradeInvoicesHeaders = [
  { dataKey: "invoice_id", title: "Id" },
  { dataKey: "type", title: "Type" },
  { dataKey: "total_amount", title: "Total amount" },
  { dataKey: "due_date", title: "Due Date" },
  { dataKey: "contact_name", title: "Contact" },
  { dataKey: "mapped_status", title: "Status" },
  { dataKey: "", title: "Actions", restrictSorting: true },
];

export const paytradePaymentsHeaders = [
  { dataKey: "payment_id", title: "payment Id" },
  { dataKey: "invoice_id", title: "invoice Id" },
  { dataKey: "payment_type", title: "type" },
  { dataKey: "payment_amount", title: "amount" },
  { dataKey: "due_date", title: "payment Date" },
  { dataKey: "contact_name", title: "Contact" },
  { dataKey: "mapped_status", title: "Status" },
  { dataKey: "", title: "Actions", restrictSorting: true },
];

export const paytradeContactsRenderData = [
  { key: "contact_name" },
  { key: "mapped_status" },
];
export const paytradeProjectsRenderData = [
  { key: "project_name" },
  { key: "mapped_status" },
];
export const paytradeContractsRenderData = [
  { key: "contract_name" },
  { key: "mapped_status" },
];
export const paytradeBankAccountsRenderData = [
  { key: "account_name" },
  { key: "mapped_status" },
];
export const paytradeBillsRenderData = [
  { key: "invoice_id" },
  { key: "type" },
  { key: "total_amount" },
  { key: "due_date" },
  { key: "contact_name" },
  { key: "mapped_status" },
];

export const paytradeInvoicesRenderData = [
  { key: "invoice_id" },
  { key: "type" },
  { key: "total_amount" },
  { key: "due_date" },
  { key: "contact_name" },
  { key: "mapped_status" },
];

export const paytradePaymentsRenderData = [
  { key: "payment_id" },
  { key: "invoice_id" },
  { key: "payment_type" },
  { key: "payment_amount" },
  { key: "payment_date" },
  { key: "contact_name" },
  { key: "mapped_status" },
];

export const xeroContactsHeaders = [
  { dataKey: "contact_name", title: "Name" },
  { dataKey: "mapped_status", title: "Status" },
  { dataKey: "", title: "Actions", restrictSorting: true },
];
export const xeroProjectsHeaders = [
  { dataKey: "project_name", title: "Name" },
  { dataKey: "mapped_status", title: "Status" },
  { dataKey: "", title: "Actions", restrictSorting: true },
];
export const xeroContractsHeaders = [
  { dataKey: "contract_name", title: "Name" },
  { dataKey: "mapped_status", title: "Status" },
  { dataKey: "", title: "Actions", restrictSorting: true },
];
export const xeroBankAccountsHeaders = [
  { dataKey: "account_name", title: "Name" },
  { dataKey: "mapped_status", title: "Status" },
  { dataKey: "", title: "Actions", restrictSorting: true },
];
export const xeroBillsHeaders = [
  { dataKey: "invoice_id", title: "Id" },
  { dataKey: "type", title: "Type" },
  { dataKey: "total_amount", title: "Total Amount" },
  { dataKey: "due_date", title: "Due Date" },
  { dataKey: "contact_name", title: "Contact" },
  { dataKey: "mapped_status", title: "Status" },
  { dataKey: "", title: "Actions", restrictSorting: true },
];
export const xeroInvoicesHeaders = [
  { dataKey: "invoice_id", title: "Id" },
  { dataKey: "type", title: "Type" },
  { dataKey: "total_amount", title: "Total Amount" },
  { dataKey: "account_name", title: "Due Date" },
  { dataKey: "account_name", title: "Contact" },

  { dataKey: "mapped_status", title: "Status" },
  { dataKey: "", title: "Actions", restrictSorting: true },
];
export const xeroPaymentsHeaders = [
  { dataKey: "payment_id", title: "payment Id" },
  { dataKey: "invoice_id", title: "invoice Id" },
  { dataKey: "payment_type", title: "type" },
  { dataKey: "payment_amount", title: "amount" },
  { dataKey: "due_date", title: "payment Date" },
  { dataKey: "contact_name", title: "Contact" },
  { dataKey: "mapped_status", title: "Status" },
  { dataKey: "", title: "Actions", restrictSorting: true },
];
export const xeroContactsRenderData = [
  { key: "contact_name" },
  { key: "mapped_status" },
];
export const xeroProjectsRenderData = [
  { key: "project_name" },
  { key: "mapped_status" },
];
export const xeroContractsRenderData = [
  { key: "contract_name" },
  { key: "mapped_status" },
];
export const xeroBankAccountsRenderData = [
  { key: "account_name" },
  {
    key: "mapped_status",
    // Task #129 — When the back-fill scheduler has already tried to
    // auto-link this orphan Xero bank account and given up (template
    // 379 sync log), surface a distinct "Needs mapping" badge instead
    // of the generic "Unmapped" label so operators can act on it from
    // the Xero bank accounts tab.
    render: (row: any) => {
      if (row?.needs_mapping) {
        const reason =
          row?.needs_mapping_reason ||
          "Auto-link skipped — please map this Xero bank account manually.";
        return React.createElement(
          "span",
          {
            className: "alert",
            title: reason,
            "data-tooltip": reason,
            "data-placement": "left",
          },
          React.createElement("i", {
            className: "fa-light fa-triangle-exclamation",
          }),
          " Needs mapping",
        );
      }
      return row?.mapped_status;
    },
  },
];
export const xeroBillsRenderData = [
  { key: "invoice_id" },
  { key: "type" },
  { key: "total_amount" },
  { key: "due_date" },
  { key: "contact_name" },

  { key: "mapped_status" },
];
export const xeroInvoicesRenderData = [
  { key: "invoice_id" },
  { key: "type" },
  { key: "total_amount" },
  { key: "due_date" },
  { key: "contact_name" },
  { key: "mapped_status" },
];
export const xeroPaymentsRenderData = [
  { key: "payment_id" },
  { key: "invoice_id" },
  { key: "payment_type" },
  { key: "payment_amount" },
  { key: "payment_date" },
  { key: "contact_name" },
  { key: "mapped_status" },
];
export const mappedContactsHeaders = [
  { dataKey: "pt_contact_name", title: "paytrade contacts" },
  { dataKey: "contact_name", title: "xero contacts" },
  { dataKey: "", title: "Action", restrictSorting: true },
];
export const mappedProjectsHeaders = [
  { dataKey: "pt_project_name", title: "paytrade projects" },
  { dataKey: "project_name", title: "xero projects" },
  { dataKey: "", title: "Action", restrictSorting: true },
];
export const mappedContractsHeaders = [
  { dataKey: "pt_contract_name", title: "paytrade contracts" },
  { dataKey: "contract_name", title: "xero contracts" },
  { dataKey: "", title: "Action", restrictSorting: true },
];
export const mappedBankAccountsHeaders = [
  { dataKey: "pt_account_name", title: "paytrade bank accounts" },
  { dataKey: "account_name", title: "xero bank accounts" },
  { dataKey: "", title: "Action", restrictSorting: true },
];
export const mappedBillsHeaders = [
  { dataKey: "pt_claim_id", title: "paytrade bill id" },
  { dataKey: "invoice_id", title: "xero bill id" },
  { dataKey: "total_amount", title: "Total Amount" },
  { dataKey: "due_date", title: "Due Date" },
  { dataKey: "contact_name", title: "Contact" },
  { dataKey: "", title: "Action", restrictSorting: true },
];
export const mappedInvoicesHeaders = [
  { dataKey: "pt_claim_id", title: "paytrade invoice id" },
  { dataKey: "invoice_id", title: "xero invoice id" },
  { dataKey: "total_amount", title: "Total Amount" },
  { dataKey: "due_date", title: "Due Date" },
  { dataKey: "contact_name", title: "Contact" },
  { dataKey: "", title: "Action", restrictSorting: true },
];
export const mappedPaymentsHeaders = [
  { dataKey: "pt_payment_id", title: "paytrade payment id" },
  { dataKey: "invoice_id", title: "xero payment id" },
  { dataKey: "total_amount", title: "Amount" },
  { dataKey: "due_date", title: "Payment Date" },
  { dataKey: "contact_name", title: "Contact" },
  { dataKey: "", title: "Action", restrictSorting: true },
];

export const mappedContactsRenderData = [
  { key: "pt_contact_name" },
  { key: "contact_name" },
];
export const mappedProjectsRenderData = [
  { key: "pt_project_name" },
  { key: "project_name" },
];
export const mappedContractsRenderData = [
  { key: "pt_contract_name" },
  { key: "contract_name" },
];
export const mappedBankAccountsRenderData = [
  { key: "pt_account_name" },
  { key: "account_name" },
];
export const mappedBillsRenderData = [
  { key: "pt_claim_id" },
  { key: "invoice_id" },
  { key: "total_amount" },
  { key: "due_date" },
  { key: "contact_name" },
];
export const mappedInvoicesRenderData = [
  { key: "pt_claim_id" },
  { key: "invoice_id" },
  { key: "total_amount" },
  { key: "due_date" },
  { key: "contact_name" },
];
export const mappedPaymentsRenderData = [
  { key: "pt_payment_id" },
  { key: "invoice_id" },
  { key: "payment_amount" },
  { key: "payment_date" },
  { key: "contact_name" },
];
export const statusOptions = [
  { label: "Mapped", value: "Mapped" },
  { label: "Unmapped", value: "Unmapped" },
];

export const integrationStatus = {
  "Connected - pending settings/mapping": 0,
  "Awaiting project id tracking setup": 0,
  "Pending bank account mapping": 1,
  "Pending contact mapping": 2,
  "Pending project tracking id mapping": 3,
  "Pending contract tracking id mapping": 4,
  "Connected - active": 6,
};

export const xeroSyncLogDetailsHeaders = [{}];
export const xeroSynLogDetailsRenderData = [{}];

export const syncLogDetailsVariables = {
  "Bank accounts": {
    combined: {
      account_name: "Account name",
      account_number: "Account number",
    },
    separate: {
      label: ["Account name", "Account number"],
      paytrade: {
        "Account name": "pt_account_name",
        "Account number": "pt_account_number",
      },
      xero: { "Account name": "name", "Account number": "bankAccountNumber" },
    },
  },
  Contacts: {
    combined: {
      contact_name: "Contact name",
    },
    separate: {
      label: ["Contract name"],
      paytrade: {
        "Contract name": "pt_contact_name",
      },
      xero: { "Contract name": "name" },
    },
  },
  Projects: {
    combined: {
      project_name: "Project name",
    },
    separate: {
      label: ["Project name"],
      paytrade: {
        "Project name": "pt_project_name",
      },
      xero: { "Project name": "name" },
    },
  },
  Contracts: {
    combined: {
      contract_name: "Contract name",
    },
    separate: {
      label: ["Contract name"],
      paytrade: {
        "Contract name": "pt_contract_name",
      },
      xero: { "Contract name": "name" },
    },
  },
};

export const yesNoOptions = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
];

export const accountTypeOptions = [
  { value: "CURRENT", label: "Current Asset" },
  { value: "FIXED", label: "Fixed Asset" },
  {
    value: "INVENTORY_ASSET_ACCOUNT_TYPE_CODE_Internal_Use_Only",
    label: "Inventory",
  },
  { value: "NONCURRENT", label: "Non-current Asset" },
  { value: "PREPAYMENT", label: "Prepayment" },
  { value: "EQUITY", label: "Equity" },
  { value: "DEPRECIATN", label: "Depreciation" },
  { value: "DIRECTCOSTS", label: "Direct Costs" },
  { value: "EXPENSE", label: "Expense" },
  { value: "OVERHEADS", label: "Overhead" },
  { value: "CURRLIAB", label: "Current Liability" },
  { value: "LIABILITY", label: "Liability" },
  { value: "TERMLIAB", label: "Non-current Liability" },
  { value: "OTHERINCOME", label: "Other Income" },
  { value: "REVENUE", label: "Revenue" },
  { value: "SALES", label: "Sales" },
];

export const taxRateOptions = [
  { value: "OUTPUT", label: "Sales" },
  { value: "INPUT", label: "Purchases" },
  { value: "EXEMPTOUTPUT", label: "GST Free Sales" },
  { value: "INPUTTAXED", label: "Exempt Income" },
  { value: "BASEXCLUDED", label: "BAS Excluded" },
  { value: "EXEMPTEXPENSES", label: "GST Free Expenses" },
];

// Canonical AU GST tax codes that PayTrade expects to be available in Xero.
// Used by XeroSettings to validate the connected Xero org and offer
// one-click creation of any that are missing.
export const canonicalXeroTaxCodes = [
  {
    type: "OUTPUT",
    name: "GST on Income",
    report_tax_type: "OUTPUT",
    rate: 10,
    component_name: "GST",
  },
  {
    type: "INPUT",
    name: "GST on Expenses",
    report_tax_type: "INPUT",
    rate: 10,
    component_name: "GST",
  },
  {
    type: "EXEMPTOUTPUT",
    name: "GST Free Income",
    report_tax_type: "EXEMPTOUTPUT",
    rate: 0,
    component_name: "GST",
  },
  {
    type: "EXEMPTEXPENSES",
    name: "GST Free Expenses",
    report_tax_type: "EXEMPTEXPENSES",
    rate: 0,
    component_name: "GST",
  },
  {
    type: "GSTONIMPORTS",
    name: "GST on Imports",
    report_tax_type: "GSTONIMPORTS",
    rate: 0,
    component_name: "GST",
  },
  {
    type: "BASEXCLUDED",
    name: "BAS Excluded",
    report_tax_type: "BASEXCLUDED",
    rate: 0,
    component_name: "GST",
  },
];
