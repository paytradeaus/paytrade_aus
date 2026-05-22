//Banking types
export type BankAccountType =
  | 'Retention Trust Account'
  | 'Project Trust Account'
  | 'Cash Account';
export type BankAccountStatus =
  | 'Draft'
  | 'Open'
  | 'Closed'
  | 'Active'
  | 'Deleted'
  | 'Archived'
  | 'Transferred';
export type InterestsAndChargesStatus =
  | 'Draft'
  | 'Matched'
  | 'Unmatched'
  | 'Deleted';
export type InterestsAndChargesType = 'Interest' | 'Charges';
export type TransactionStatus =
  | 'To Review'
  | 'Unmatched'
  | 'Matched'
  | 'Excluded'
  | 'Deleted';
export type LastUpdateType = 'Manual' | 'Open Banking';
export type AdditionalCostStatus = 'Draft' | 'Unmatched' | 'Matched';
export type BankStatementStatus = 'Open' | 'Locked';
export type PaymentStatus = 'Unmatched' | 'Matched' | 'Locked' | 'Deleted';
export type DelegatePowers = 'Yes' | 'No';
// Task #238 — explicit Close/Transfer or implicit Rename action on a
// Project / Retention Trust account. Persisted on `bank_accounts` so the
// TA2 / Contracting-Party Account Closing Notice generators can read the
// closing context back without a separate pipe-through param.
export type ClosingMode = 'Closed' | 'Transferred' | 'Renamed';

//Banking File attachments
export type FileAttachmentOrDocumentType =
  | 'Retention trust certificate'
  | 'Trust training record'
  | 'Transaction csv file attachment'
  | 'Supporting statement attachment'
  | 'Optional supporting statement attachment'
  | 'Other optional payment claim attachment'
  | 'Other optional payment attachment'
  | '3rd party payment attachment'
  | 'Other payment attachment'
  | 'Part payment advice attachment'
  | 'Payless full payment advice attachment'
  | 'Payless part payment advice attachment'
  | 'Pay zero payment advice attachment'
  | 'Bank statement';

//Payment-claims
export type PaymentClaimTypes = 'Billable' | 'Receivable';

export type PaymentClaimStatuses =
  | 'Draft'
  | 'Confirmed'
  | 'No Match Required'
  | 'Unconfirmed - Unmatched'
  | 'Unconfirmed - Matched'
  | 'Unconfirmed - Payment Unmatched - Retention Out Matched - Retention In Unmatched'
  | 'Unconfirmed - Payment Unmatched - Retention Out Unmatched - Retention In Matched'
  | 'Unconfirmed - Payment Unmatched - Retention Out Matched - Retention In Matched'
  | 'Unconfirmed - Payment Matched - Retention Out Unmatched - Retention In Unmatched'
  | 'Unconfirmed - Payment Matched - Retention Out Matched - Retention In Unmatched'
  | 'Unconfirmed - Payment Matched - Retention Out Unmatched - Retention In Matched'
  | 'Paid - Payment Unmatched - Retention Out Matched - Retention In Unmatched'
  | 'Paid - Payment Unmatched - Retention Out Matched - Retention In Matched'
  | 'Paid - Payment Unmatched - Retention Out Unmatched - Retention In Matched'
  | 'Paid - Payment Matched - Retention Out Unmatched - Retention In Matched'
  | 'Paid - Payment Matched - Retention Out Matched - Retention In Unmatched'
  | 'Paid - Payment Matched - Retention Out Unmatched - Retention In Unmatched'
  | 'Paid - Unmatched'
  | 'Paid - Matched'
  | 'Received - Unmatched'
  | 'Received - Matched'
  | 'Deleted';

export type PaymentStatuses = 'Unmatched' | 'Matched' | 'Auto matched';

export type RetentionListStatus =
  | 'Retained'
  | 'Claim generated'
  | 'Claim completed'
  | 'Payment generated'
  | 'Completed'
  | 'Deleted';

export type RetentionSummaryStatus = 'Retained' | 'Completed' | 'Deleted';

export type BeneficiaryType = 'Current supplier' | 'Other supplier' | 'Self';

export type SubPaymentTypes =
  | 'Payment'
  | 'Retention'
  | 'Retention Out'
  | 'Retention In'
  | 'Retention Retained';
export type ClientSupplierType = 'Client' | 'Supplier';
//Payments
export type PaymentTypes =
  | 'Full'
  | 'Part'
  | 'Pay Less - Full'
  | 'Pay Less - Part'
  | 'Pay - Zero'
  | '3rd Party'
  | 'Interest Received'
  | 'Interest Withdrawal'
  | 'Bank Charge Applied'
  | 'Bank Charge Top Up'
  | 'Top Up'
  | 'Withdrawal'
  | 'Overpayment refund from supplier'
  | 'Overpayment refund to client'
  | 'Overpayment to supplier'
  | 'Underpayment to supplier'
  | 'Overpayment from client'
  | 'Underpayment from client'
  | 'Top Up Retention';
export type RetentionPaymentStatus = 'Not paid' | 'Paid';
export type CashRetentionType = 'Claim' | 'Retention claim';

//To-dos
export type TodoType = 'Documents' | 'Payments' | 'Compliance' | 'Notices';

//notices

export type NoticeTypes =
  | 'QBCC TA1 Project Trust Account Notice'
  | 'Client S18B Project Trust Account Notice'
  | 'Supplier S23 Project Trust Account Notice'
  | 'QBCC TA3 Notice Of Related Entities'
  | 'Supplier S18C Project Trust Account Notice'
  | 'Client Payment Claim Notice'
  | 'Supplier Payment Schedule Notice'
  | 'Supplier Payment Remittance Advice Notice'
  | 'QBCC TA4 Part Payment Notice'
  | 'QBCC TA2 Account Closing Notice'
  | 'QBCC TA5 Nil Return Notice'
  | 'Supplier Retention Payment Remittance Notice'
  | 'Supplier Retention Payment Schedule Notice'
  | 'Supplier Payment with Retention Withheld Notice'
  | 'Supplier Payment with Retention Schedule Notice'
  | 'Supplier S23 Retention Trust Account Notice'
  | 'Supplier S18C Retention Trust Account Notice'
  | 'QBCC TA1 Retention Trust Account Notice'
  | 'Contracting Party Account Closing Notice'
  | 'QBCC TA2 Retention Account Closing Notice'
  | 'S75 Supporting Statement';

export type NoticeStatus =
  | 'Draft'
  | 'Not Sent'
  | 'Sending'
  | 'Sent'
  | 'Delete-Sent'
  | 'Delete-Unsent'
  | 'Sent - Onboarded'
  | 'Received'
  | 'Delete-Received';

export type NoticeView = 'Basic' | 'Paid' | 'Paid-delegated';

//Compliances
export type ComplianceChecksOfRTA =
  | 'CHECK CONTRACT ELIGIBILITY'
  | 'OPEN RETENTION TRUST ACCOUNT'
  | 'NOTIFY PARTIES OF THE TRUST ACCOUNT'
  | 'ADMINISTRATION OF THE ACCOUNT'
  | 'WITHHOLDING RETENTION AMOUNTS FROM PAYMENT'
  | 'RELEASING RETENTION AMOUNTS TO CONTRACTED PARTIES'
  | 'RELEASING RETENTION AMOUNTS TO SOMEONE ELSE FROM THE ACCOUNT'
  | 'RELEASING RETENTION AMOUNTS TO YOURSELF AS TRUSTEE'
  | 'MONTHLY RECONCILIATIONS AND RECORDKEEPING'
  | 'ANNUAL ACCOUNT REVIEW REPORTS'
  | 'CLOSE THE ACCOUNT';
export type ComplianceChecksOfPTA =
  | 'CHECK CONTRACT ELIGIBILITY'
  | 'OPEN PROJECT TRUST ACCOUNT'
  | 'NOTIFY PARTIES OF THE TRUST ACCOUNT'
  | 'ADMINISTRATION OF THE ACCOUNT'
  | 'PAYMENTS FROM THE PRINCIPAL'
  | 'PAYMENTS TO SUBCONTRACTORS'
  | 'PAYMENTS TO YOURSELF AS TRUSTEE'
  | 'MONTHLY RECONCILIATIONS AND RECORDKEEPING'
  | 'ANNUAL ACCOUNT REVIEW REPORTS'
  | 'CLOSE THE ACCOUNT';
export type ComplianceStatus = 'Ok' | 'Action required';
export type ActionButtonType =
  | 'EDIT_PROJECT'
  | 'ADD_BANK_ACCOUNT'
  | 'EDIT_BANK_ACCOUNT'
  | 'NONE'
  | 'MATCH_TRANSACTIONS'
  | 'ADD_CONTRACT'
  | 'EDIT_CONTRACT'
  | 'SEND_NOTICE'
  | 'RECONCILE'
  | 'REVIEW_AUDIT'
  | 'VIEW_UNMATCHED_PAYMENTS'
  | 'SEND_SCHEDULE'
  | 'UPDATE_TRANSACTION_LIST'
  | 'TOPUP_ACCOUNT'
  | 'SEND_REMITTANCE'
  | 'WITHDRAW_BALANCE'
  | 'UPDATE_AND_MATCH'
  | 'PAY_NOW'
  | 'DELEGATE_NOW'
  | 'UPLOAD_CERTIFICATE'
  | 'VIEW_PAYMENTS';
export type ComplianceCheckStatus = 'PASSED' | 'FAILED';

//Trust Accounting
export type ReconcileStatus = 'Balanced' | 'Unbalanced';
export type ReportStatus = 'Active' | 'Deleted';
export type NilReturnStatus = 'Yes' | 'NA';
export type BalanceCheck = 'Ok' | 'Error';

//User details
export type UserMode = 'Onboarding' | 'Normal';

// Integrations
export type MappedStatus = 'Manual' | 'Auto' | 'System';
export type MappedStatuses = 'Mapped' | 'Unmapped';
export type Integrations = 'Xero' | 'Adatree';
export type ProviderTpe = 'Accounting' | 'Open banking' | 'ERP';
export type IntegrationStatus =
  | 'Inactive'
  | 'Disconnected'
  | 'Deleted - archived'
  | 'Connected - paused'
  | 'Connected - active'
  | 'Connected - pending settings/mapping'
  | 'Pending bank account mapping'
  | 'Pending contact mapping'
  | 'Pending invoice mapping'
  | 'Pending bill mapping'
  | 'Pending payment mapping'
  | 'Pending project tracking id check'
  | 'Awaiting project id tracking setup'
  | 'Pending project tracking id mapping'
  | 'Pending contract tracking id check'
  | 'Awaiting contract id tracking setup'
  | 'Skip contract mapping'
  | 'Pending contract tracking id mapping'
  | 'Activation in Progress'
  | 'Pending';

export type XeroProcess = 'Pay Trade > Xero' | 'Xero > Pay Trade';
export type XeroStatus = 'Succeeded' | 'Warning' | 'Failed';
export type SyncAsDraftStatus = 'Yes' | 'No';
