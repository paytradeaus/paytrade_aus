export const returnOptions = [
  { value: "Yes", label: "Yes" },
  { value: "NA", label: "NA" },
];

export type AuditReportType = {
  audit_date: string;
  file?: any;
  file_name?: any;
  account_name: string;
  audit_id: number;
  bank_account_id: number;
  account_type?: string;
  company_id: number;
  id: string;
  nil_return: string;
  report_date: string;
  statement_id: number;
};

export const AccountTypeList = [
  { label: "Project Trust Account", value: "Project Trust Account" },
  { label: "Retention Trust Account", value: "Retention Trust Account" },
];

export const DateOptions = [
  { value: "", label: "All Dates" },
  { value: "Custom", label: "Custom" },
  { value: "Last Month", label: "Last Month" },
  { value: "This Month", label: "This Month" },
];
