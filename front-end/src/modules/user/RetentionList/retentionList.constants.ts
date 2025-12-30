export const tabOptions = [
  { id: "Current", label: "Current", hasError: false },
  // { id: "Un paid", label: "Un paid", hasError: false },
  { id: "Completed", label: "Completed", hasError: false },
  // Add more tabs as needed
];

export const retentionListHeaders = [
  // "Retention ID",
  "Project",
  "Contract",
  "Retention Type",
  "Retention Trust Account",
  "Retained AMT",
  "Beneficiary",
  "Status",
];

export const retentionGridListHeaders = [
  // { title: "Retention ID", dataKey: "retention_list_id" },
  { title: "Project", dataKey: "project_name" },
  { title: "Contract", dataKey: "contract_name" },
  { title: "Retention Type", dataKey: "claim_type" },
  { title: "Retention Trust Account", dataKey: "retention_trust_account_name" },
  { title: "Retained AMT", dataKey: "retained_amount" },
  { title: "Beneficiary", dataKey: "beneficiary_name" },
  { title: "Status", dataKey: "status" },
  { title: "Actions", dataKey: "" },
];

export const pdfDataRow = [
  // "retention_list_id",
  "project_name",
  "contract_name",
  "claim_type",
  "retention_trust_account_name",
  "retained_amount",
  "Beneficiary",
  "status",
];

export const RetentionRenderData = [
  // { key: "retention_list_id" },
  { key: "project_name" },
  { key: "contract_name" },
  { key: "claim_type" },
  { key: "retention_trust_account_name" },
  { key: "retained_amount" },
  { key: "beneficiary_name" },
  { key: "status", enableStatusIcons: true },
];

export const retentionExcelColumnNames = [
  // { value: "retention_list_id", label: "Retention ID" },
  { value: "project_name", label: "Project" },
  { value: "contract_name", label: "Contract" },
  { value: "claim_type", label: "Retention Type" },
  { value: "retention_trust_account_name", label: "Retention Trust Account" },
  { value: "retained_amount", label: "Retained AMT" },
  { value: "beneficiary_name", label: "Beneficiary" },
  { value: "status", label: "Status" },
];

export const RetentionSummaryRenderData = [
  { key: "event_id" },
  { key: "retained_on" },
  // { key: "retention_id" },
  { key: "retention_type" },
  { key: "retained_on" },
  { key: "amount" },
  { key: "payment_amount" },
  { key: "beneficiary_name" },
  { key: "retained_account_name" },
];

export const retentionSummaryGridListHeaders = [
  { title: "Event Id", dataKey: "event_id" },
  { title: "Retained On", dataKey: "retained_on" },
  // { title: "Retention Id", dataKey: "retention_id" },
  { title: "Retention Type", dataKey: "retention_type" },
  { title: "Payment Date", dataKey: "retained_on" },
  { title: "Retained AMT", dataKey: "amount" },
  { title: "Payment AMT", dataKey: "payment_amount" },
  { title: "For Beneficiary", dataKey: "beneficiary_name" },
  { title: "Retained Account Name", dataKey: "retained_account_name" },
];
