export const NoticesexcelColumnNames = [
  { value: "notice_date", label: "Date Generated" },
  { value: "project_name", label: "Project Name" },
  { value: "account_name", label: "Account Name" },
  { value: "bank_account_type", label: "Type" },
  { value: "notice_type", label: "Notice Type" },
  { value: "notice_source", label: "Notice Source" },
  { value: "status", label: "Status" },
];

export const Noticespdfheaders: string[] = [
  "Date Generated",
  "Project Name",
  "Account Name",
  "Type",
  "Notice Type",
  "Notice Source",
  "status",
];

export const NoticespdfDataRow: any[] = [
  "notice_date",
  "project_name",
  "account_name",
  "bank_account_type",
  "notice_type",
  "notice_source",
  "status",
];

export const NoticespdfheaderNames = [
  { title: "Date Generated", dataKey: "notice_date" },
  { title: "Project Name", dataKey: "project_name" },
  { title: "Account Name", dataKey: "account_name" },
  { title: "Type", dataKey: "bank_account_type" },
  { title: "Notice Type", dataKey: "notice_type" },
  { title: "Notice Source", dataKey: "notice_source", restrictSorting: true },
  { title: "Status", dataKey: "status" },
  { title: "View", dataKey: "", restrictSorting: true },
];

export const NoticesRenderData = [
  { key: "notice_date" },
  { key: "project_name" },
  { key: "account_name" },
  { key: "bank_account_type" },
  { key: "notice_type" },
  { key: "notice_source", returnOnClickTableData: true, enableHighlight: true },
  { key: "status", enableStatusIcons: true },
];

export const tabOptions = [
  {
    id: "Current",
    label: "Current",
    hasError: false,
  },
  {
    id: "Archived",
    label: "Archived",
    hasError: false,
  },
  {
    id: "Received",
    label: "Received",
    hasError: false,
  },
];

export const bankAccountShortTypes = {
  "Cash Account": "Cash",
  "Project Trust Account": "PTA",
  "Retention Trust Account": "RTA",
};

export const noticesAutomationType = [
  {
    label: "Basic",
    value: "Basic",
  },
  {
    label: "Premium",
    value: "Premium",
  },
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
export const SupportDocNotRequiredNoticeTypes = [
  "Supplier S23 Retention Trust Account Notice",
  "Supplier S23 Project Trust Account Notice",
  "QBCC TA1 Project Trust Account Notice",
  "QBCC TA1 Retention Trust Account Notice",
  "Client S18B Project Trust Account Notice",
];

export const attachmentType = {
  NOTICE_UPLOAD: "Notices_uploads",
  COMPULSORY_ATTACHMENTS: "Compulsory_attachments",
  QBCC_ATTACHMENT: "qbcc_notice_uploads",
};

export const fileButtonType = {
  ADD_NOTICE: "Add Notice",
  ADD_SUPPORT_ATTACHMENT: "Add Support Document",
};

export const noticeSourceType = {
  CLAIM: "claim",
  PAYMENT: "payment",
  BANK_ACCOUNT: "account",
  CONTRACT: "contract",
  AUDIT: "audit",
};
