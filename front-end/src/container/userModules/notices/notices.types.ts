type DateTime = string; // Assuming DateTime is represented as a string in ISO format

interface AttachmentResponse {
  attachment_type: string;
  file_name: string;
  file_path: string;
  file_type: string;
  id: string;
  file: string;
}

export interface INoticeViewData {
  ViewType: string | null;
  bank_account_id: number;
  bank_account_name: string;
  bank_account_number: string;
  client_supplier_id: number | null;
  client_supplier_name: string | null;
  client_supplier_type: string | null;
  company_id: number;
  company_name: string;
  contract_date: DateTime | null;
  contract_id: number;
  contract_name: string;
  notice_source: string;
  notice_template: AttachmentResponse;
  notice_type: string;
  project_date: DateTime | null;
  project_id: number;
  project_name: string;
  status: string;
  supportDoc: AttachmentResponse;
  uploadedNotice: AttachmentResponse | null;
  notice_id: number;
  id: string;
  memo_notes: string;
}

export const SupportDocNotRequiredNoticeTypes = [
  "Supplier S23 Retention Trust Account Notice",
  "Supplier S23 Project Trust Account Notice",
  "QBCC TA1 Project Trust Account Notice",
  "QBCC TA1 Retention Trust Account Notice",
  "Client S18B Project Trust Account Notice",
];

export const QBCCNoticeTypesOnly = [
  "QBCC TA1 Project Trust Account Notice",
  "QBCC TA3 Notice Of Related Entities",
  "QBCC TA4 Part Payment Notice",
  "QBCC TA2 Account Closing Notice",
  "QBCC TA5 Nil Return Notice",
  "QBCC TA1 Retention Trust Account Notice",
  "QBCC TA2 Retention Account Closing Notice",
];
