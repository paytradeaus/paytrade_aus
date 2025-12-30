import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import {
  BankAccountType,
  BeneficiaryType,
  CashRetentionType,
  NoticeStatus,
  NoticeTypes,
  NoticeView,
  PaymentClaimTypes,
} from 'src/libs/@paytrade-types/paytrade-types';
import { PaymentDetailsinPaymentClaimsList } from '../banking/payment-claims/payment-claims.response';
import { ApiStatusType } from 'src/libs/@response-framer/response-framer';

/* ------------------ NOTICE GENERATION ------------------ */
@ObjectType({ description: 'Data representing a generated notice.' })
class generateNotice {
  @Field({ description: 'Unique identifier for the notice.' })
  notice_id: number;

  @Field({ description: 'UUID of the generated notice.' })
  id: string;
}

@ObjectType({ description: 'Data representing a generated notice mail.' })
class generateNoticeMail {
  @Field({ description: 'UUID of the generated notice mail.' })
  id: string;

  @Field({ description: 'Notice mail ID.' })
  notice_mail_id: number;

  @Field({ nullable: true, description: 'Associated notice ID.' })
  notice_id?: number;
}

/* ------------------ APPLICANT & FROM/TO DETAILS ------------------ */
@ObjectType({ description: 'Applicant details for a notice.' })
class applicantDetails {
  @Field({ nullable: true, description: 'Applicant name.' })
  name?: string;

  @Field({ nullable: true, description: 'Position of the applicant.' })
  position?: string;

  @Field({ nullable: true, description: 'business name of the applicant.' })
  business?: string;

  @Field({ nullable: true, description: 'Address of the applicant.' })
  address?: string;

  @Field({ nullable: true, description: 'Email of the applicant.' })
  email?: string;

  @Field({ nullable: true, description: 'Postcode of the applicant.' })
  postcode?: number;
}

@ObjectType({ description: 'Details of notice sender or receiver.' })
class noticeFromToDetails {
  @Field({ nullable: true, description: 'Name of the individual.' })
  name?: string;

  @Field({ nullable: true, description: 'business name.' })
  business?: string;

  @Field({
    nullable: true,
    description: 'Address of the business or individual.',
  })
  address?: string;

  @Field({ nullable: true, description: 'Phone number.' })
  phone?: number;

  @Field({ nullable: true, description: 'Australian business Number.' })
  acn?: string;

  @Field({ nullable: true, description: 'Australian Business Number.' })
  abn?: string;
}

/* ------------------ CLAIM INVOICES ------------------ */
@ObjectType({ description: 'Details of a single claim invoice line item.' })
class claimInvoiceDetails {
  @Field({ nullable: true, description: 'Description of the invoice item.' })
  description?: string;

  @Field({ nullable: true, description: 'Quantity of the item.' })
  quantity?: number;

  @Field({ nullable: true, description: 'Unit price of the item.' })
  unit_price?: number;

  @Field({ nullable: true, description: 'GST applied to the item.' })
  gst?: number;

  @Field({ nullable: true, description: 'Total amount including GST.' })
  total_amount_including_gst?: number;
}

@ObjectType({ description: 'Invoice details including totals and line items.' })
class claimInvoiceWithTotal {
  @Field({ nullable: true, description: 'Contact person for the invoice.' })
  contact?: string;

  @Field({ nullable: true, description: 'Due date of the invoice.' })
  due?: Date;

  @Field({ nullable: true, description: 'Invoice date.' })
  invoice_date?: Date;

  @Field({ nullable: true, description: 'Invoice ID.' })
  invoice_id?: number;

  @Field({ nullable: true, description: 'Job associated with the invoice.' })
  job?: string;

  @Field({ nullable: true, description: 'Payment terms in days.' })
  terms?: number;

  @Field(() => [claimInvoiceDetails], {
    nullable: true,
    description: 'List of invoice line items.',
  })
  invoice_list?: claimInvoiceDetails[];

  @Field({ nullable: true, description: 'Total amount of the invoice.' })
  total?: number;
}

/* ------------------ NOTICE DOCUMENT ------------------ */
@ObjectType({
  description:
    'Details of a notice document including applicant, sender, receiver, and invoices.',
})
class generateNoticeDoc {
  @Field({ nullable: true, description: 'Applicant details.' })
  applicant_details?: applicantDetails;

  @Field({ nullable: true, description: 'From details.' })
  from_details?: noticeFromToDetails;

  @Field({ nullable: true, description: 'To details.' })
  to_details?: noticeFromToDetails;

  @Field({ nullable: true, description: 'Claim invoice details.' })
  claim_invoice_details?: claimInvoiceWithTotal;

  @Field({ nullable: true, description: 'Project trust details ID.' })
  project_trust_details?: number;
}

/* ------------------ NOTICE MAILS ------------------ */
@ObjectType({ description: 'Details for updating a notice mail.' })
class updateNoticeMail {
  @Field({ description: 'UUID of the mail.' })
  id: string;

  @Field({ description: 'Notice mail ID.' })
  notice_mail_id: number;

  @Field({ nullable: true, description: 'Email from address.' })
  email_from?: string;

  @Field({ nullable: true, description: 'Email to address.' })
  email_to?: string;

  @Field({ nullable: true, description: 'Email CC addresses.' })
  email_cc?: string;

  @Field({ nullable: true, description: 'Email subject.' })
  email_subject?: string;

  @Field({ nullable: true, description: 'Email content.' })
  email_content?: string;
}

/* ------------------ LIST OF MAILS ------------------ */
@ObjectType({ description: 'Mail list of a specific notice.' })
class listMailsOfANotice {
  @Field({ description: 'UUID of the mail record.' })
  id: string;

  @Field({ description: 'Notice ID.' })
  notice_id: number;

  @Field({ description: 'Notice mail ID.' })
  notice_mail_id: number;

  @Field({ nullable: true, description: 'Email from address.' })
  email_from?: string;

  @Field({ nullable: true, description: 'Email to address.' })
  email_to?: string;

  @Field({ nullable: true, description: 'Email subject.' })
  email_subject?: string;

  @Field({ nullable: true, description: 'Date when email was sent.' })
  email_date?: Date;

  @Field({ nullable: true, description: 'Client or supplier name.' })
  client_supplier_name?: string;

  @Field({ nullable: true, description: 'business name.' })
  company_name?: string;
}

/* ------------------ NOTICE STATUS ------------------ */
@ObjectType({ description: 'Status of a notice.' })
class noticeStatus {
  @Field({ description: 'Notice ID.' })
  notice_id: number;

  @Field({ nullable: true, description: 'Status enum of the notice.' })
  status?: NoticeStatus;
}

/* ------------------ GENERATE NOTICE RESPONSE ------------------ */
@ObjectType({ description: 'Response after generating a notice.' })
export class generateNoticeResponse {
  @Field({ description: 'Response status.' })
  status: string;

  @Field({ description: 'Response message.' })
  message: string;

  @Field({ nullable: true, description: 'Generated notice data.' })
  data?: generateNotice;
}

/* ------------------ ATTACHMENTS ------------------ */
@ObjectType({ description: 'Attachment file details.' })
class attachmentResponse {
  @Field({ nullable: true, description: 'Attachment ID.' })
  id?: string;

  @Field({ nullable: true, description: 'File name.' })
  file_name?: string;

  @Field({ nullable: true, description: 'File type.' })
  file_type?: string;

  @Field({ nullable: true, description: 'Attachment type.' })
  attachment_type?: string;

  @Field({ nullable: true, description: 'File path in storage.' })
  file_path?: string;

  @Field({ nullable: true, description: 'Base64 encoded file content.' })
  file?: string;
}

/* ------------------ NOTICE FILE & MAIL DETAILS ------------------ */
@ObjectType({
  description: 'Notice file and mail details for sending preview.',
})
export class noticeFileAndMailDetails {
  @Field({ nullable: true, description: 'Mail UUID.' })
  mail_uuid?: string;

  @Field(() => attachmentResponse, {
    nullable: true,
    description: 'File attachment details.',
  })
  file_details?: attachmentResponse;
}

@ObjectType({ description: 'QBCC notice file and mail details.' })
export class qbccNoticeFileAndMailDetails {
  @Field({ nullable: true, description: 'Notice UUID.' })
  notice_uuid?: string;

  @Field(() => attachmentResponse, {
    nullable: true,
    description: 'QBCC file attachment details.',
  })
  qbcc_file_details?: attachmentResponse;
}

/* ------------------ SENT NOTICE MAIL RESPONSE ------------------ */
@ObjectType({ description: 'Response after sending a notice mail.' })
export class sentNoticeMailResponse {
  @Field({ description: 'Response status.' })
  status: string;

  @Field(() => String, { nullable: true, description: 'Response message.' })
  message?: string;

  @Field({ nullable: true, description: 'Notice file details.' })
  notice_file?: noticeFileAndMailDetails;

  @Field({ nullable: true, description: 'QBCC notice file details.' })
  qbcc_notice_file?: qbccNoticeFileAndMailDetails;
}

/* ------------------ GENERATE NOTICE MAIL RESPONSE ------------------ */
@ObjectType({ description: 'Response after generating a notice mail.' })
export class generateNoticeMailResponse {
  @Field({ description: 'Response status.' })
  status: string;

  @Field({ description: 'Response message.' })
  message: string;

  @Field({ nullable: true, description: 'Generated notice mail data.' })
  data?: generateNoticeMail;
}

/* ------------------ GENERATE NOTICE DOCUMENT RESPONSE ------------------ */
@ObjectType({ description: 'Response after generating a notice document.' })
export class generateNoticeDocResponse {
  @Field({ description: 'Response status.' })
  status: string;

  @Field({ description: 'Response message.' })
  message: string;

  @Field({ nullable: true, description: 'Generated notice document data.' })
  data?: generateNoticeDoc;
}

/* ------------------ REGENERATE NOTICE ------------------ */
@ObjectType({ description: 'Data for regenerating a notice.' })
export class RegenerateNoticeData {
  @Field(() => Int, { description: 'Notice ID to regenerate.' })
  notice_id: number;
}

@ObjectType({ description: 'Response after regenerating a notice.' })
export class RegenerateNoticeResponse {
  @Field({ description: 'Response status.' })
  status: string;

  @Field(() => String, {
    nullable: true,
    description: 'Optional response message.',
  })
  message?: string;

  @Field(() => RegenerateNoticeData, {
    nullable: true,
    description: 'Data of the regenerated notice.',
  })
  data?: RegenerateNoticeData;
}

/* ------------------ UPDATE NOTICE MAIL RESPONSE ------------------ */
@ObjectType({ description: 'Response after updating a notice mail.' })
export class updateNoticeMailResponse {
  @Field({ description: 'Response status.' })
  status: string;

  @Field({ description: 'Response message.' })
  message: string;

  @Field({ nullable: true, description: 'Updated notice mail data.' })
  data?: updateNoticeMail;
}

/* ------------------ NOTICE STATUS RESPONSE ------------------ */
@ObjectType({ description: 'Response containing the status of a notice.' })
export class noticeStatusResponse {
  @Field({ description: 'Response status.' })
  status: string;

  @Field({ description: 'Response message.' })
  message: string;

  @Field({ nullable: true, description: 'Notice status data.' })
  data?: noticeStatus;
}

/* ------------------ SOURCE CLAIM DETAILS ------------------ */
@ObjectType({ description: 'Source claim details for a notice.' })
export class sourceClaimDetails {
  @Field({ nullable: true, description: 'Type of payment claim.' })
  claim_type?: PaymentClaimTypes;

  @Field({ nullable: true, description: 'Type of cash retention.' })
  cash_retention_type?: CashRetentionType;

  @Field({ nullable: true, description: 'Type of beneficiary.' })
  beneficiary_type?: BeneficiaryType;

  @Field(() => [PaymentDetailsinPaymentClaimsList], {
    nullable: true,
    description: 'List of payment details in the claim.',
  })
  payments?: PaymentDetailsinPaymentClaimsList[];
}

/* ------------------ NOTICE DETAILS ------------------ */
@ObjectType({ description: 'Details of a notice.' })
export class noticeDetails {
  @Field({ nullable: true, description: 'UUID of the notice.' })
  id?: string;

  @Field({ description: 'Notice ID.' })
  notice_id: number;

  @Field({ description: 'business ID associated with the notice.' })
  company_id: number;

  @Field({ nullable: true, description: 'business name.' })
  company_name?: string;

  @Field({ nullable: true, description: 'Project ID.' })
  project_id?: number;

  @Field({ nullable: true, description: 'Project name.' })
  project_name?: string;

  @Field({ nullable: true, description: 'Contract ID.' })
  contract_id?: number;

  @Field({ nullable: true, description: 'Contract name.' })
  contract_name?: string;

  @Field({ nullable: true, description: 'Type of notice.' })
  notice_type?: NoticeTypes;

  @Field({ nullable: true, description: 'Bank account ID used for payment.' })
  bank_account_id?: number;

  @Field({ nullable: true, description: 'Bank account type.' })
  bank_account_type?: BankAccountType;

  @Field({ nullable: true, description: 'Account name for payment.' })
  account_name?: string;

  @Field({
    nullable: true,
    description: 'Payment ID associated with the notice.',
  })
  payment_id?: number;

  @Field({ nullable: true, description: 'Date of the notice.' })
  notice_date?: Date;

  @Field({ nullable: true, description: 'Payment claim ID if applicable.' })
  payment_claim_id?: number;

  @Field({ nullable: true, description: 'Source of the notice.' })
  notice_source?: string;

  @Field({ nullable: true, description: 'Source type of the notice.' })
  source_type?: string;

  @Field({ nullable: true, description: 'Contract UUID.' })
  contract_uuid?: string;

  @Field({ nullable: true, description: 'Source claim details if applicable.' })
  source_claim_details?: sourceClaimDetails;

  @Field({ nullable: true, description: 'Status of the notice.' })
  status?: NoticeStatus;

  @Field({ nullable: true, description: 'Flag if document generation failed.' })
  notice_document_gen_failed?: boolean;
}

/* ------------------ DELEGATED ACCOUNTS ------------------ */
@ObjectType({ description: 'Details of a delegated account.' })
export class delegatedAccountsDetails {
  @Field({ description: 'business ID.' })
  company_id: number;

  @Field({ nullable: true, description: 'business name.' })
  company_name?: string;

  @Field({ nullable: true, description: 'Bank account ID.' })
  bank_account_id?: number;

  @Field({ nullable: true, description: 'Bank account name.' })
  account_name?: string;

  @Field({ nullable: true, description: 'Bank account type.' })
  account_type?: string;

  @Field({ nullable: true, description: 'Date of delegation.' })
  delegated_date?: Date;

  @Field({ nullable: true, description: 'Delegation type or notes.' })
  delegation?: string;
}

/* ------------------ FETCH DETAILS OF A NOTICE ------------------ */
@ObjectType({
  description: 'Full details of a notice including attachments and status.',
})
export class FetchDetailsOfANotice {
  @Field({ nullable: true, description: 'UUID of the notice.' })
  id?: string;

  @Field({ description: 'Notice ID.' })
  notice_id: number;

  @Field({ nullable: true, description: 'Type of notice.' })
  notice_type?: NoticeTypes;

  @Field({ nullable: true, description: 'Source of the notice.' })
  notice_source?: string;

  @Field({
    nullable: true,
    description: 'Memo notes associated with the notice.',
  })
  memo_notes?: string;

  @Field(() => attachmentResponse, {
    nullable: true,
    description: 'Template used for the notice.',
  })
  notice_template?: attachmentResponse;

  @Field(() => [attachmentResponse], {
    nullable: true,
    description: 'Supporting documents for the notice.',
  })
  supportDoc?: attachmentResponse[];

  @Field(() => attachmentResponse, {
    nullable: true,
    description: 'Uploaded notice document.',
  })
  uploadedNotice?: attachmentResponse;

  @Field(() => attachmentResponse, {
    nullable: true,
    description: 'QBCC notice file.',
  })
  qbccNotice?: attachmentResponse;

  @Field(() => attachmentResponse, {
    nullable: true,
    description: 'Section 75 file attachment.',
  })
  s75_file?: attachmentResponse;

  @Field({ nullable: true, description: 'View type of the notice.' })
  ViewType?: NoticeView;

  @Field({ nullable: true, description: 'Status of the notice.' })
  status?: NoticeStatus;

  @Field({ description: 'business ID associated with the notice.' })
  company_id: number;

  @Field({ nullable: true, description: 'business name.' })
  company_name?: string;

  @Field({ nullable: true, description: 'Project ID.' })
  project_id?: number;

  @Field({ nullable: true, description: 'Project name.' })
  project_name?: string;

  @Field({ nullable: true, description: 'Project date.' })
  project_date?: Date;

  @Field({ nullable: true, description: 'Contract ID.' })
  contract_id?: number;

  @Field({ nullable: true, description: 'Contract UUID.' })
  contract_uuid?: string;

  @Field({ nullable: true, description: 'Contract name.' })
  contract_name?: string;

  @Field({ nullable: true, description: 'Contract date.' })
  contract_date?: Date;

  @Field({ nullable: true, description: 'Client/Supplier ID.' })
  client_supplier_id?: number;

  @Field({ nullable: true, description: 'Client/Supplier name.' })
  client_supplier_name?: string;

  @Field({ nullable: true, description: 'Client/Supplier type.' })
  client_supplier_type?: string;

  @Field({ nullable: true, description: 'Bank account ID for payments.' })
  bank_account_id?: number;

  @Field({ nullable: true, description: 'Bank account name.' })
  bank_account_name?: string;

  @Field({ nullable: true, description: 'Bank account number.' })
  bank_account_number?: string;

  @Field({ nullable: true, description: 'Source type.' })
  source_type?: string;

  @Field(() => sourceClaimDetails, {
    nullable: true,
    description: 'Source claim details if any.',
  })
  source_claim_details?: sourceClaimDetails;

  @Field({ nullable: true, description: 'Payment claim ID if any.' })
  payment_claim_id?: number;

  @Field({ nullable: true, description: 'Payment ID if any.' })
  payment_id?: number;

  @Field({ nullable: true, description: 'Flag if document generation failed.' })
  notice_document_gen_failed?: boolean;
}
/* ------------------ FETCH NOTICE MAIL ------------------ */
@ObjectType({
  description: 'Details of a fetched notice mail, including attachments.',
})
class fetchNoticeMail {
  @Field({ nullable: true, description: 'UUID of the fetched notice mail.' })
  id?: string;

  @Field({ description: 'Notice mail ID.' })
  notice_mail_id: number;

  @Field({ nullable: true, description: 'Associated notice ID.' })
  notice_id?: number;

  @Field({ nullable: true, description: 'Email sender.' })
  email_from?: string;

  @Field({ nullable: true, description: 'Email recipient.' })
  email_to?: string;

  @Field({ nullable: true, description: 'Email CC recipients.' })
  email_cc?: string;

  @Field({ nullable: true, description: 'Subject of the email.' })
  email_subject?: string;

  @Field({ nullable: true, description: 'Content/body of the email.' })
  email_content?: string;

  @Field(() => [attachmentResponse], {
    nullable: true,
    description: 'Supporting documents attached to the email.',
  })
  supportDoc?: attachmentResponse[];

  @Field(() => attachmentResponse, {
    nullable: true,
    description: 'Uploaded notice attachment if any.',
  })
  uploadedNotice?: attachmentResponse;
}

/* ------------------ DELEGATED ACCOUNTS LIST ------------------ */
@ObjectType({ description: 'List of delegated accounts with total count.' })
export class delegatedAccountsListWithTotalCount {
  @Field(() => [delegatedAccountsDetails], {
    nullable: true,
    description: 'List of delegated accounts.',
  })
  account_list?: delegatedAccountsDetails[];

  @Field({ description: 'Total number of delegated accounts.' })
  total_count: number;
}

/* ------------------ NOTICES LIST ------------------ */
@ObjectType({ description: 'List of notices with total count.' })
export class noticesListWithTotalCount {
  @Field(() => [noticeDetails], {
    nullable: true,
    description: 'List of notices.',
  })
  notices_list?: noticeDetails[];

  @Field({ description: 'Total number of notices.' })
  total_count: number;
}

/* ------------------ LIST MAILS OF A NOTICE ------------------ */
@ObjectType({ description: 'List of mails of a notice with total count.' })
export class ListMailsofNoticeWithTotalCount {
  @Field(() => [listMailsOfANotice], {
    nullable: true,
    description: 'List of mails for the notice.',
  })
  mails_list?: listMailsOfANotice[];

  @Field({ description: 'Total number of mails for the notice.' })
  total_count: number;
}

/* ------------------ LIST ALL NOTICES RESPONSE ------------------ */
@ObjectType({ description: 'Response for fetching all notices.' })
export class listAllNoticesResponse {
  @Field({ description: 'Response status.' })
  status: string;

  @Field({ description: 'Response message.' })
  message: string;

  @Field({
    nullable: true,
    description: 'List of all notices with total count.',
  })
  data?: noticesListWithTotalCount;
}

/* ------------------ LIST ALL DELEGATED ACCOUNTS RESPONSE ------------------ */
@ObjectType({ description: 'Response for fetching all delegated accounts.' })
export class listAllDelegatedAccountsResponse {
  @Field({ description: 'Response status.' })
  status: string;

  @Field({ description: 'Response message.' })
  message: string;

  @Field({
    nullable: true,
    description: 'List of all delegated accounts with total count.',
  })
  data?: delegatedAccountsListWithTotalCount;
}

/* ------------------ LIST MAILS OF A NOTICE RESPONSE ------------------ */
@ObjectType({ description: 'Response for fetching all mails of a notice.' })
export class listMailsOfANoticeResponse {
  @Field({ description: 'Response status.' })
  status: string;

  @Field({ description: 'Response message.' })
  message: string;

  @Field({ nullable: true, description: 'List of mails with total count.' })
  data?: ListMailsofNoticeWithTotalCount;
}

/* ------------------ FETCH DETAILS OF A NOTICE RESPONSE ------------------ */
@ObjectType({
  description: 'Response for fetching details of a specific notice.',
})
export class FetchDetailsOfANoticeResponse {
  @Field({ description: 'Response status.' })
  status: string;

  @Field({ description: 'Response message.' })
  message: string;

  @Field({ nullable: true, description: 'Details of the notice.' })
  data?: FetchDetailsOfANotice;
}

/* ------------------ FETCH NOTICE MAIL RESPONSE ------------------ */
@ObjectType({ description: 'Response for fetching a notice mail.' })
export class fetchNoticeMailResponse {
  @Field({ description: 'Response status.' })
  status: string;

  @Field({ description: 'Response message.' })
  message: string;

  @Field({ nullable: true, description: 'Fetched notice mail data.' })
  data?: fetchNoticeMail;
}

/* ------------------ FETCH ALL UNSENT NOTICES OF A business ------------------ */
@ObjectType({ description: 'Unsent notice details for a business.' })
export class FetchAllUnsentNoticesOfACompany {
  @Field({ description: 'Type of notice.' })
  notice_type: NoticeTypes;

  @Field({ description: 'Status of the notice: Not Sent or Sending.' })
  status: 'Not Sent' | 'Sending';

  @Field({ description: 'UUID of the notice.' })
  id: string;

  @Field({ description: 'Notice ID.' })
  notice_id: number;

  @Field({ nullable: true, description: 'Bank account ID if applicable.' })
  bank_account_id?: string;

  @Field({ nullable: true, description: 'Bank account name if applicable.' })
  bank_account_name?: string;

  @Field({ nullable: true, description: 'Bank account type if applicable.' })
  bank_account_type?: BankAccountType;
}

@ObjectType({
  description: 'Response for fetching all unsent notices of a business.',
})
export class FetchAllUnsentNoticesOfACompanyResponse {
  @Field({ description: 'Response status.' })
  status: ApiStatusType;

  @Field({ description: 'Response message.' })
  message: string;

  @Field(() => [FetchAllUnsentNoticesOfACompany], {
    nullable: true,
    description: 'List of unsent notices for the business.',
  })
  data?: FetchAllUnsentNoticesOfACompany[];
}

/* ------------------ TRIGGER NOTICES RESPONSE ------------------ */
@ObjectType({
  description:
    'Data for triggered notices including previews and QBCC notices.',
})
export class TriggerNoticesData {
  @Field(() => [noticeFileAndMailDetails], {
    nullable: true,
    description: 'Preview of generated notices.',
  })
  notice_previews?: noticeFileAndMailDetails[];

  @Field(() => [qbccNoticeFileAndMailDetails], {
    nullable: true,
    description: 'Preview of generated QBCC notices.',
  })
  qbcc_notice_previews?: qbccNoticeFileAndMailDetails[];
}

@ObjectType({ description: 'Response after triggering notices.' })
export class triggerNoticesResponse {
  @Field({ description: 'Response status.' })
  status: string;

  @Field({ nullable: true, description: 'Response message.' })
  message?: string;

  @Field(() => TriggerNoticesData, {
    nullable: true,
    description: 'Data containing notice previews and QBCC notices.',
  })
  data?: TriggerNoticesData;
}
