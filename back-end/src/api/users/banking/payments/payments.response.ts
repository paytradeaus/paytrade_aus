import { Field, Float, ObjectType } from '@nestjs/graphql';
import {
  ClientSupplierRole,
  RetentionType,
} from 'src/entities/contract-details.entity';
import {
  BankAccountType,
  BeneficiaryType,
  CashRetentionType,
  PaymentClaimTypes,
  PaymentStatus,
  PaymentStatuses,
  PaymentTypes,
  RetentionListStatus,
  RetentionSummaryStatus,
  SubPaymentTypes,
  TransactionStatus,
} from 'src/libs/@paytrade-types/paytrade-types';
import {
  FetchAllTransactions,
  FetchMatchedTxn,
} from '../transactions/transactions.response';
import { GraphQLJSONObject } from 'graphql-type-json';
import { FetchInvoiceDetailsOfAPaymentClaimResponse } from '../payment-claims/invoice-details/invoice-details.response';
import { FileAttachmentDetailsResponse } from 'src/api/admin/communication-management/response/communication-management.response';
import { PaymentDetailsinPaymentClaimsList } from '../payment-claims/payment-claims.response';
import { TriggerNoticesData } from '../../notices/notices.response';
import { ApiStatusType } from 'src/libs/@response-framer/response-framer';

@ObjectType({
  description:
    'Represents a newly added payment along with any triggered notices.',
})
export class AddPayment {
  @Field({ description: 'Unique identifier for the payment.' })
  payment_id: number;

  @Field(() => TriggerNoticesData, {
    nullable: true,
    description: 'Optional triggered notices associated with this payment.',
  })
  notices?: TriggerNoticesData;
}

@ObjectType({
  description: 'Represents notice details associated with a payment.',
})
export class NoticeDetails {
  @Field(() => TriggerNoticesData, {
    nullable: true,
    description: 'Optional triggered notices data.',
  })
  notices?: TriggerNoticesData;
}

@ObjectType({ description: 'Detailed information of an associated payment.' })
export class FetchDetailsOfAnAssociatedPayment {
  @Field({ nullable: true, description: 'Unique identifier of the payment.' })
  payment_id: number;

  @Field({ nullable: true, description: 'Type of the payment.' })
  payment_type: PaymentTypes;

  @Field({ nullable: true, description: 'Current status of the payment.' })
  status: PaymentStatus;

  @Field({ nullable: true, description: 'Status as displayed in the UI.' })
  list_status: string;

  @Field({ nullable: true, description: 'Associated payment claim ID.' })
  payment_claim_id: number;

  @Field({ nullable: true, description: 'Associated project ID.' })
  project_id: number;

  @Field({ nullable: true, description: 'Project name.' })
  project_name: string;

  @Field({ nullable: true, description: 'Project start or reference date.' })
  project_date: Date;

  @Field({ nullable: true, description: 'Associated contract ID.' })
  contract_id: number;

  @Field({ nullable: true, description: 'Contract name.' })
  contract_name: string;

  @Field({ nullable: true, description: 'Contract start or reference date.' })
  contract_date: Date;

  @Field({
    nullable: true,
    description: 'Type of payment claim associated with the payment.',
  })
  claim_type: PaymentClaimTypes;

  @Field({ nullable: true, description: 'Client or supplier ID.' })
  client_supplier_id: number;

  @Field({ nullable: true, description: 'Client or supplier name.' })
  client_supplier_name: string;

  @Field({ nullable: true, description: 'Client or supplier type.' })
  client_supplier_type: string;

  @Field({ nullable: true, description: 'Type of cash retention applicable.' })
  cash_retention_type: CashRetentionType;

  @Field({
    nullable: true,
    description: 'Indicates if cash retention applies.',
  })
  cash_retention: Boolean;

  @Field({
    nullable: true,
    description: 'ID of the payment account from which payment is made.',
  })
  payment_from_account: number;

  @Field({ nullable: true, description: 'Name of the payment from account.' })
  payment_from_account_name: string;

  @Field({ nullable: true, description: 'Type of the payment from account.' })
  payment_from_account_type: string;

  @Field({
    nullable: true,
    description: 'BSB number of the payment from account.',
  })
  payment_from_account_bsb_number: string;

  @Field({
    nullable: true,
    description: 'Account number of the payment from account.',
  })
  payment_from_account_number: string;

  @Field({
    nullable: true,
    description: 'ID of the payment account to which payment is made.',
  })
  payment_to_account: number;

  @Field({ nullable: true, description: 'Name of the payment to account.' })
  payment_to_account_name: string;

  @Field({
    nullable: true,
    description: 'BSB number of the payment to account.',
  })
  payment_to_account_bsb_number: string;

  @Field({
    nullable: true,
    description: 'Account number of the payment to account.',
  })
  payment_to_account_number: string;

  @Field({ nullable: true, description: 'Payment due date.' })
  due_date: Date;

  @Field({ nullable: true, description: 'Date when payment was sent.' })
  sent_date: Date;

  @Field({ nullable: true, description: 'Date when payment was received.' })
  received_date: Date;

  @Field({
    nullable: true,
    description:
      'Task #52 — true when a Xero Payment record is currently mapped to this PT (associated) payment. Mirrors the field on FetchDetailsOfAPayment so OtherPayment sub-modules that pass associated_payment_details as patchData can render the same Xero sync indicators.',
  })
  xero_payment_synced: Boolean;

  @Field({
    nullable: true,
    description:
      'Task #52 — true when a Xero BankTransfer record is currently mapped to this PT (associated) payment. Mirrors the field on FetchDetailsOfAPayment so OtherPayment sub-modules that pass associated_payment_details as patchData can render the same Xero sync indicators.',
  })
  xero_transfer_synced: Boolean;

  // Retention fields
  @Field(() => Float, {
    nullable: true,
    description: 'Retention amount if applicable.',
  })
  retention_amount: number;

  @Field({
    nullable: true,
    description: 'Formatted retention amount as string.',
  })
  formatted_retention_amount: string;

  @Field({ nullable: true, description: 'Retention account ID.' })
  retention_account: number;

  @Field({ nullable: true, description: 'Retention account number.' })
  retention_account_number: number;

  @Field({
    nullable: true,
    description: 'Associated payment ID for linked payments.',
  })
  associated_payment_id: number;

  @Field({
    nullable: true,
    description: 'Associated overpayment ID if applicable.',
  })
  associated_overpayment_id: number;

  @Field({ nullable: true, description: 'Name of the retention account.' })
  retention_account_name: string;

  @Field({ nullable: true, description: 'Retention release date.' })
  retention_release_date: Date;

  @Field(() => Float, { nullable: true, description: 'Retention ID.' })
  retention_id: number;

  @Field({
    nullable: true,
    description: 'Indicates if payment is confirmed as paid.',
  })
  is_paid_confirmed: Boolean;

  @Field({
    nullable: true,
    description: 'Indicates if payment is confirmed as received.',
  })
  is_received_confirmed: Boolean;

  @Field({
    nullable: true,
    description: 'Indicates if retention is confirmed.',
  })
  is_retention_confirmed: Boolean;

  @Field(() => Float, { nullable: true, description: 'Amount of the payment.' })
  payment_amount: number;

  @Field({ nullable: true, description: 'Formatted payment amount.' })
  formatted_payment_amount: string;

  @Field(() => Float, {
    nullable: true,
    description: 'Total payment amount including all components.',
  })
  total_amount: number;

  @Field({ nullable: true, description: 'Formatted total payment amount.' })
  formatted_total_amount: string;

  @Field(() => Float, {
    nullable: true,
    description: 'Claim amount associated with the payment.',
  })
  claim_amount: number;

  @Field({ nullable: true, description: 'Formatted claim amount.' })
  formatted_claim_amount: string;

  @Field(() => Float, {
    nullable: true,
    description: 'Total GST included in the payment.',
  })
  gst_summary: number;

  @Field(() => Float, { nullable: true, description: 'Payless amount if any.' })
  payless_amount: number;

  @Field({ nullable: true, description: 'Formatted payless amount.' })
  formatted_payless_amount: string;

  @Field(() => Float, {
    nullable: true,
    description: 'Outstanding amount remaining to be paid.',
  })
  outstanding_amount: number;

  @Field(() => Float, {
    nullable: true,
    description: 'Outstanding retention amount.',
  })
  outstanding_retention_amount: number;

  @Field({
    nullable: true,
    description: 'Formatted outstanding retention amount.',
  })
  formatted_outstanding_retention_amount: string;

  @Field({ nullable: true, description: 'Date when the payment was made.' })
  payment_date: Date;

  @Field({
    nullable: true,
    description: 'Date when the payment record was entered.',
  })
  input_date: Date;

  @Field({ nullable: true, description: 'Memo from the associated claim.' })
  claim_memo: string;

  @Field({ nullable: true, description: 'Memo entered for this payment.' })
  memo: string;

  @Field(() => [String], {
    nullable: true,
    description: 'Optional attachment IDs for the payment.',
  })
  optional_attachment_ids: string[];

  @Field(() => [String], {
    nullable: true,
    description: 'Compulsory attachment IDs for the payment.',
  })
  compulsory_attachment_ids: string[];

  @Field(() => [String], {
    nullable: true,
    description: 'List of matched transaction IDs.',
  })
  matched_transactions: string[];

  @Field({
    nullable: true,
    description: 'Reason for third-party payment if applicable.',
  })
  third_party_payment_reason: string;

  @Field({ nullable: true, description: 'Reason for withholding the payment.' })
  withhold_payment_reason?: string;

  @Field({ nullable: true, description: 'UI status representation.' })
  status_in_ui: string;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Buttons to display on payment overview UI.',
  })
  payment_overview_buttons: Record<string, any>;

  @Field(() => Float, {
    nullable: true,
    description: 'Retention list ID if applicable.',
  })
  retention_list_id: number;

  @Field({
    nullable: true,
    description: 'Type of beneficiary for the payment.',
  })
  beneficiary_type: BeneficiaryType;

  @Field({ nullable: true, description: 'Role of the client or supplier.' })
  client_supplier_role: ClientSupplierRole;

  @Field({ nullable: true, description: 'Type of retention.' })
  retention_type: RetentionType;

  @Field(() => [FetchInvoiceDetailsOfClaimResponse], {
    nullable: true,
    description: 'List of invoices associated with the payment.',
  })
  invoices: FetchInvoiceDetailsOfClaimResponse[];

  @Field({ nullable: true, description: 'Reference string of the claim.' })
  claim_reference: string;

  @Field({ nullable: true, description: 'Payment terms.' })
  payment_terms: string;

  @Field({ nullable: true, description: 'Type of the payment-to account.' })
  payment_to_account_type: string;

  @Field({ nullable: true, description: 'Indicates if GST is optional.' })
  is_gst_optional: boolean;

  @Field({ nullable: true, description: 'Address of the client or supplier.' })
  client_supplier_address: string;
}

@ObjectType({ description: 'Detailed information about a specific payment.' })
export class FetchDetailsOfAPayment {
  @Field({ description: 'Unique identifier of the payment.' })
  payment_id: number;

  @Field({ nullable: true, description: 'Type of the payment.' })
  payment_type: PaymentTypes;

  @Field({ nullable: true, description: 'Current status of the payment.' })
  status: PaymentStatus;

  @Field({ nullable: true, description: 'Status as displayed in the UI.' })
  list_status: string;

  @Field({ nullable: true, description: 'Associated payment claim ID.' })
  payment_claim_id: number;

  @Field({
    nullable: true,
    description: 'Project ID associated with this payment.',
  })
  project_id: number;

  @Field({ nullable: true, description: 'Project name.' })
  project_name: string;

  @Field({ nullable: true, description: 'Project reference or start date.' })
  project_date: Date;

  @Field({
    nullable: true,
    description: 'Contract ID associated with this payment.',
  })
  contract_id: number;

  @Field({ nullable: true, description: 'Contract name.' })
  contract_name: string;

  @Field({ nullable: true, description: 'Contract reference or start date.' })
  contract_date: Date;

  @Field({
    nullable: true,
    description: 'Defect liability end date for the project, if applicable.',
  })
  defect_liability_end_date: Date;

  @Field({
    nullable: true,
    description: 'Type of claim associated with the payment.',
  })
  claim_type: PaymentClaimTypes;

  @Field({
    nullable: true,
    description: 'Client or supplier ID associated with the payment.',
  })
  client_supplier_id: number;

  @Field({ nullable: true, description: 'Client or supplier name.' })
  client_supplier_name: string;

  @Field({ nullable: true, description: 'Client or supplier type.' })
  client_supplier_type: string;

  @Field({
    nullable: true,
    description: 'Type of cash retention if applicable.',
  })
  cash_retention_type: CashRetentionType;

  @Field({
    nullable: true,
    description: 'Indicates whether cash retention applies to this payment.',
  })
  cash_retention: Boolean;

  @Field({ nullable: true, description: 'Payment from account ID.' })
  payment_from_account: number;

  @Field({ nullable: true, description: 'Payment from account name.' })
  payment_from_account_name: string;

  @Field({ nullable: true, description: 'Payment from account type.' })
  payment_from_account_type: string;

  @Field({ nullable: true, description: 'Payment from account BSB number.' })
  payment_from_account_bsb_number: string;

  @Field({ nullable: true, description: 'Payment from account number.' })
  payment_from_account_number: string;

  @Field({ nullable: true, description: 'Payment to account ID.' })
  payment_to_account: number;

  @Field({ nullable: true, description: 'Payment to account name.' })
  payment_to_account_name: string;

  @Field({ nullable: true, description: 'Payment to account BSB number.' })
  payment_to_account_bsb_number: string;

  @Field({ nullable: true, description: 'Payment to account number.' })
  payment_to_account_number: string;

  @Field({ nullable: true, description: 'Payment due date.' })
  due_date: Date;

  @Field({ nullable: true, description: 'Date when the payment was sent.' })
  sent_date: Date;

  @Field({ nullable: true, description: 'Date when the payment was received.' })
  received_date: Date;

  // Retention fields
  @Field(() => Float, {
    nullable: true,
    description: 'Retention amount if applicable.',
  })
  retention_amount: number;

  @Field({
    nullable: true,
    description: 'Formatted retention amount as a string.',
  })
  formatted_retention_amount: string;

  @Field({
    nullable: true,
    description:
      'Indicates whether the payment has associated claim retention.',
  })
  has_claim_retention: Boolean;

  @Field({
    nullable: true,
    description: 'Retention percentage applied to the payment.',
  })
  retention_percentage: number;

  @Field(() => Float, {
    nullable: true,
    description: 'Claim retention amount if applicable.',
  })
  claim_retention_amount: number;

  @Field({ nullable: true, description: 'Formatted claim retention amount.' })
  formatted_claim_retention_amount: string;

  @Field(() => Float, {
    nullable: true,
    description: 'Retention amount including GST if applicable.',
  })
  retention_amount_with_gst: number;

  @Field({
    nullable: true,
    description: 'Formatted retention amount including GST.',
  })
  formatted_retention_amount_with_gst: string;

  @Field({ nullable: true, description: 'Retention account ID.' })
  retention_account: number;

  @Field({ nullable: true, description: 'Retention account number.' })
  retention_account_number: number;

  @Field({ nullable: true, description: 'Associated payment ID if linked.' })
  associated_payment_id: number;

  @Field({
    nullable: true,
    description: 'Associated overpayment ID if linked.',
  })
  associated_overpayment_id: number;

  @Field({ nullable: true, description: 'Retention account name.' })
  retention_account_name: string;

  @Field({ nullable: true, description: 'Date when retention was released.' })
  retention_release_date: Date;

  @Field(() => Float, { nullable: true, description: 'Retention record ID.' })
  retention_id: number;

  @Field({
    nullable: true,
    description: 'Indicates if payment is confirmed as paid.',
  })
  is_paid_confirmed: Boolean;

  @Field({
    nullable: true,
    description: 'Indicates if payment is confirmed as received.',
  })
  is_received_confirmed: Boolean;

  @Field({
    nullable: true,
    description: 'Indicates if retention is confirmed.',
  })
  is_retention_confirmed: Boolean;

  @Field({
    nullable: true,
    description:
      'Task #52 — true when a Xero Payment record is currently mapped to this PT payment (xero_payments.payment_id IS NOT NULL). Used by the UI to decide whether un-ticking Confirm Paid should warn the user about deleting the Xero record.',
  })
  xero_payment_synced: Boolean;

  @Field({
    nullable: true,
    description:
      'Task #52 — true when a Xero BankTransfer record is currently mapped to this PT payment (xero_payments.bank_transfer_id IS NOT NULL). Used by the UI to decide whether un-ticking Confirm Retention should warn the user about reversing the Xero transfer.',
  })
  xero_transfer_synced: Boolean;

  @Field(() => Float, {
    nullable: true,
    description: 'Payment amount excluding retention.',
  })
  payment_amount: number;

  @Field({ nullable: true, description: 'Formatted payment amount.' })
  formatted_payment_amount: string;

  @Field(() => Float, {
    nullable: true,
    description: 'Total payment amount including retention and GST.',
  })
  total_amount: number;

  @Field({ nullable: true, description: 'Formatted total amount.' })
  formatted_total_amount: string;

  @Field(() => Float, {
    nullable: true,
    description: 'Claim amount for this payment.',
  })
  claim_amount: number;

  @Field({ nullable: true, description: 'Formatted claim amount.' })
  formatted_claim_amount: string;

  @Field(() => Float, {
    nullable: true,
    description: 'GST summary for the payment.',
  })
  gst_summary: number;

  @Field(() => Float, {
    nullable: true,
    description: 'Payless amount if applicable.',
  })
  payless_amount: number;

  @Field({ nullable: true, description: 'Formatted payless amount.' })
  formatted_payless_amount: string;

  @Field(() => Float, {
    nullable: true,
    description: 'Outstanding amount remaining to be paid.',
  })
  outstanding_amount: number;

  @Field(() => Float, {
    nullable: true,
    description: 'Outstanding retention amount remaining to be paid.',
  })
  outstanding_retention_amount: number;

  @Field({
    nullable: true,
    description: 'Formatted outstanding retention amount.',
  })
  formatted_outstanding_retention_amount: string;

  @Field({ nullable: true, description: 'Date when payment was made.' })
  payment_date: Date;

  @Field({
    nullable: true,
    description: 'Date when the payment record was entered.',
  })
  input_date: Date;

  @Field({ nullable: true, description: 'Memo from the associated claim.' })
  claim_memo: string;

  @Field({ nullable: true, description: 'Memo entered for this payment.' })
  memo: string;

  @Field(() => [String], {
    nullable: true,
    description: 'Optional attachment IDs.',
  })
  optional_attachment_ids: string[];

  @Field(() => [String], {
    nullable: true,
    description: 'Compulsory attachment IDs.',
  })
  compulsory_attachment_ids: string[];

  @Field(() => [String], {
    nullable: true,
    description: 'Matched transaction IDs for reconciliation.',
  })
  matched_transactions: string[];

  @Field({
    nullable: true,
    description: 'Reason for third-party payment if applicable.',
  })
  third_party_payment_reason: string;

  @Field({ nullable: true, description: 'Reason for withholding the payment.' })
  withhold_payment_reason?: string;

  @Field({ nullable: true, description: 'UI status representation.' })
  status_in_ui: string;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Buttons to display in payment overview UI.',
  })
  payment_overview_buttons: Record<string, any>;

  @Field(() => Float, {
    nullable: true,
    description: 'Retention list ID if applicable.',
  })
  retention_list_id: number;

  @Field({
    nullable: true,
    description: 'Type of beneficiary for this payment.',
  })
  beneficiary_type: BeneficiaryType;

  @Field({ nullable: true, description: 'Role of the client or supplier.' })
  client_supplier_role: ClientSupplierRole;

  @Field({ nullable: true, description: 'Type of retention applicable.' })
  retention_type: RetentionType;

  @Field(() => [FetchInvoiceDetailsOfClaimResponse], {
    nullable: true,
    description: 'List of invoices for this payment.',
  })
  invoices: FetchInvoiceDetailsOfClaimResponse[];

  @Field({ nullable: true, description: 'Claim reference string.' })
  claim_reference: string;

  @Field({ nullable: true, description: 'Payment terms for this payment.' })
  payment_terms: string;

  @Field({ nullable: true, description: 'Type of the payment-to account.' })
  payment_to_account_type: string;

  @Field({ nullable: true, description: 'Indicates if GST is optional.' })
  is_gst_optional: boolean;

  @Field({ nullable: true, description: 'Address of the client or supplier.' })
  client_supplier_address: string;

  @Field({
    nullable: true,
    description: 'Detailed information about associated payment, if any.',
  })
  associated_payment_details?: FetchDetailsOfAnAssociatedPayment;

  @Field({
    nullable: true,
    description: 'Detailed information about associated overpayment, if any.',
  })
  associated_overpayment_details?: FetchDetailsOfAnAssociatedPayment;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Buttons to display in payment list UI.',
  })
  payment_list_buttons: Record<string, any>;
}

@ObjectType({ description: 'Payment details associated with a claim.' })
export class paymentdetailsOfClaim {
  @Field({
    nullable: true,
    description: 'Type of beneficiary for the payment.',
  })
  beneficiary_type: BeneficiaryType;

  @Field(() => [PaymentDetailsinPaymentClaimsList], {
    nullable: true,
    description: 'List of payments under this claim.',
  })
  payments: PaymentDetailsinPaymentClaimsList[];
}

@ObjectType({
  description: 'Details of a payment available for matching against claims.',
})
export class FetchDetailsOfPaymentToMatch {
  @Field({ nullable: true, description: 'ID of the payment.' })
  payment_id: number;

  @Field({ description: 'ID of the sub-payment.' })
  sub_payment_id: number;

  @Field({ nullable: true, description: 'Type of the sub-payment.' })
  sub_payment_type: SubPaymentTypes;

  @Field({
    nullable: true,
    description: 'Type of cash retention if applicable.',
  })
  cash_retention_type: CashRetentionType;

  @Field({ nullable: true, description: 'Status of the payment.' })
  status: PaymentStatus;

  @Field({ nullable: true, description: 'Associated payment claim ID.' })
  payment_claim_id: number;

  @Field({ nullable: true, description: 'Payment claim details.' })
  claim_details: paymentdetailsOfClaim;

  @Field({ nullable: true, description: 'Type of claim.' })
  claim_type: PaymentClaimTypes;

  @Field({ nullable: true, description: 'Client or supplier ID.' })
  client_supplier_id: number;

  @Field({ nullable: true, description: 'Client or supplier name.' })
  client_supplier_name: string;

  @Field({ description: 'Payment type.' })
  payment_type: PaymentTypes;

  @Field({ nullable: true, description: 'Payment from account ID.' })
  payment_from_account: number;

  @Field({ nullable: true, description: 'Name of payment from account.' })
  payment_from_account_name: string;

  @Field({ nullable: true, description: 'Payment to account ID.' })
  payment_to_account: number;

  @Field({ nullable: true, description: 'Name of payment to account.' })
  payment_to_account_name: string;

  @Field({ nullable: true, description: 'Retention account number.' })
  retention_account_number: number;

  @Field({ nullable: true, description: 'Retention account name.' })
  retention_account_name: string;

  @Field(() => Float, { nullable: true, description: 'Payment amount.' })
  amount: number;

  @Field(() => Float, { nullable: true, description: 'Amount already spent.' })
  spent_amount: number;

  @Field(() => Float, { nullable: true, description: 'Amount received.' })
  received_amount: number;

  @Field({ nullable: true, description: 'Date of the payment.' })
  payment_date: Date;

  @Field({
    nullable: true,
    description: 'Indicates if this is an external/other payment.',
  })
  is_other_payment: boolean;

  @Field({
    nullable: true,
    description: 'Indicates if the payment is receivable.',
  })
  is_receivable: boolean;

  @Field({ nullable: true, description: 'Associated business ID.' })
  company_id: number;
}

@ObjectType({ description: 'Details of matched payments for reconciliation.' })
export class FetchMatchedPayment {
  @Field({ description: 'ID of the sub-payment.' })
  sub_payment_id: number;

  @Field({ nullable: true, description: 'ID of the main payment.' })
  payment_id: number;

  @Field({ nullable: true, description: 'Type of sub-payment.' })
  sub_payment_type: SubPaymentTypes;

  @Field({ nullable: true, description: 'Name of the payment from account.' })
  payment_from_account_name: string;

  @Field({ nullable: true, description: 'Name of the payment to account.' })
  payment_to_account_name: string;

  @Field({ nullable: true, description: 'Name of retention account.' })
  retention_account_name: string;

  @Field(() => Float, { nullable: true, description: 'Payment amount.' })
  amount: number;

  @Field(() => Float, { nullable: true, description: 'Amount already spent.' })
  spent_amount: number;

  @Field(() => Float, { nullable: true, description: 'Amount received.' })
  received_amount: number;

  @Field({ nullable: true, description: 'Date of the payment.' })
  payment_date: Date;

  @Field({ nullable: true, description: 'Associated business ID.' })
  company_id: number;

  @Field({ nullable: true, description: 'Type of payment.' })
  payment_type: PaymentTypes;

  @Field(() => Float, {
    nullable: true,
    description: 'Total amount including all sub-payments.',
  })
  total_amount: number;
}

@ObjectType({ description: 'Details of a single sub-payment.' })
export class FetchDetailsOfSubPayment {
  @Field({ description: 'Unique ID for this sub-payment entry.' })
  id: string;

  @Field({ description: 'Sub-payment ID.' })
  sub_payment_id: number;

  @Field({ nullable: true, description: 'Associated main payment ID.' })
  payment_id: number;

  @Field({ description: 'Payment type.' })
  payment_type: PaymentTypes;

  @Field({ nullable: true, description: 'Type of sub-payment.' })
  sub_payment_type: SubPaymentTypes;

  @Field({ nullable: true, description: 'Current status of the sub-payment.' })
  status: PaymentStatus;

  @Field({ nullable: true, description: 'List status for UI display.' })
  list_status?: string;

  @Field({ nullable: true, description: 'Associated payment claim ID.' })
  payment_claim_id: number;

  @Field({ nullable: true, description: 'Type of claim associated.' })
  claim_type: PaymentClaimTypes;

  @Field({ nullable: true, description: 'Claim amount for this sub-payment.' })
  claim_amount: number;

  @Field({ nullable: true, description: 'Formatted claim amount.' })
  formatted_claim_amount: string;

  @Field({ nullable: true, description: 'Project ID.' })
  project_id: number;

  @Field({ nullable: true, description: 'Project name.' })
  project_name: string;

  @Field({ nullable: true, description: 'Contract ID.' })
  contract_id: number;

  @Field({ nullable: true, description: 'Contract name.' })
  contract_name: string;

  @Field({ nullable: true, description: 'Cash retention type if applicable.' })
  cash_retention_type: CashRetentionType;

  @Field({ nullable: true, description: 'Payment from account ID.' })
  payment_from_account: number;

  @Field({ nullable: true, description: 'Payment from account number.' })
  payment_from_account_number: number;

  @Field({ nullable: true, description: 'Payment from account BSB number.' })
  payment_from_account_bsb_number: string;

  @Field({
    nullable: true,
    description: 'Financial institution of payment from account.',
  })
  payment_from_account_fin_ins: string;

  @Field({ nullable: true, description: 'Name of payment from account.' })
  payment_from_account_name: string;

  @Field({ nullable: true, description: 'Payment to account ID.' })
  payment_to_account: number;

  @Field({ nullable: true, description: 'Name of payment to account.' })
  payment_to_account_name: string;

  @Field({ nullable: true, description: 'Payment to account BSB number.' })
  payment_to_account_bsb_number: string;

  @Field({ nullable: true, description: 'Payment to account number.' })
  payment_to_account_number: string;

  @Field(() => Float, { nullable: true, description: 'Payment amount.' })
  amount: number;

  @Field({ nullable: true, description: 'Formatted payment amount.' })
  formatted_amount: string;

  @Field(() => Float, { nullable: true, description: 'Amount already spent.' })
  spent_amount: number;

  @Field({ nullable: true, description: 'Formatted spent amount.' })
  formatted_spent_amount: string;

  @Field(() => Float, { nullable: true, description: 'Amount received.' })
  received_amount: number;

  @Field({ nullable: true, description: 'Formatted received amount.' })
  formatted_received_amount: string;

  @Field({ nullable: true, description: 'Payment date.' })
  payment_date: Date;

  @Field({ nullable: true, description: 'Payment due date.' })
  due_date: Date;

  @Field({
    nullable: true,
    description: 'Indicates if payment is confirmed as paid.',
  })
  is_paid_confirmed: Boolean;

  @Field({
    nullable: true,
    description: 'Indicates if payment is confirmed as received.',
  })
  is_received_confirmed: Boolean;

  @Field({
    nullable: true,
    description: 'Indicates if retention is confirmed.',
  })
  is_retention_confirmed: Boolean;

  @Field({ nullable: true, description: 'Indicates if payment is late.' })
  is_late: Boolean;
}

@ObjectType({ description: 'List of sub-payments along with total count.' })
export class ListSubPaymentsWithCount {
  @Field(() => [FetchDetailsOfSubPayment], {
    nullable: true,
    description: 'Array of sub-payments.',
  })
  payments: FetchDetailsOfSubPayment[];

  @Field({ description: 'Total number of sub-payments.' })
  total_count: Number;
}

@ObjectType({ description: 'Response structure for list of sub-payments.' })
export class ListSubPaymentsResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({ description: 'Response message.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data payload with sub-payment list and count.',
  })
  data: ListSubPaymentsWithCount;
}

@ObjectType({
  description:
    'A single sub-payment that was excluded from a generated ABA file, with the reason and missing fields.',
})
export class AbaSkippedPayment {
  @Field({ nullable: true, description: 'Sub-payment ID that was skipped.' })
  sub_payment_id: number;

  @Field({ nullable: true, description: 'Parent payment ID.' })
  payment_id: number;

  @Field({ nullable: true, description: 'Payment type (e.g. Full, Part).' })
  payment_type: string;

  @Field({ nullable: true, description: 'Display name of the recipient.' })
  recipient_name: string;

  @Field({
    nullable: true,
    description: 'Display name of the sender bank account.',
  })
  sender_account_name: string;

  @Field(() => Float, {
    nullable: true,
    description: 'Amount that would have been included.',
  })
  amount: number;

  @Field({
    nullable: true,
    description: 'Human-readable reason this sub-payment was skipped.',
  })
  reason: string;

  @Field(() => [String], {
    nullable: true,
    description:
      'Machine-readable list of missing fields (e.g. recipient_bsb, recipient_account_number, sender_apca_number, sender_account_number).',
  })
  missing_fields: string[];
}

@ObjectType({
  description:
    'A sender bank account that was skipped entirely from ABA generation (e.g. missing APCA number).',
})
export class AbaSkippedAccount {
  @Field({ nullable: true, description: 'Sender bank account ID.' })
  bank_account_id: number;

  @Field({ nullable: true, description: 'Company ID owning the bank account.' })
  company_id: number;

  @Field({ nullable: true, description: 'Display name of the bank account.' })
  account_name: string;

  @Field({ nullable: true, description: 'Account number of the sender.' })
  account_number: string;

  @Field({
    nullable: true,
    description: 'Human-readable reason this account was skipped.',
  })
  reason: string;

  @Field(() => Float, {
    nullable: true,
    description: 'Number of payments that were skipped because of this account.',
  })
  skipped_payment_count: number;
}

@ObjectType({ description: 'Response structure for a file attachment.' })
export class FileAttachmenResponse {
  @Field({
    nullable: true,
    description: 'Unique identifier of the attachment.',
  })
  id: string;

  @Field({
    nullable: true,
    description: 'Type of the attachment (e.g., invoice, receipt).',
  })
  attachment_type: string;

  @Field({ nullable: true, description: 'Name of the file.' })
  file_name: string;

  @Field({ nullable: true, description: 'Path or URL to the file.' })
  file_path: string;

  @Field({ nullable: true, description: 'MIME type of the file.' })
  file_type: string;

  @Field({
    nullable: true,
    description: 'ABA-specific message or validation result.',
  })
  aba_message: string;

  @Field({
    nullable: true,
    description: 'Bank account ID associated with the attachment.',
  })
  bank_account_id: string;

  @Field({
    nullable: true,
    description: 'ID of the business associated with the file.',
  })
  company_id: number;

  @Field(() => [Number], {
    nullable: true,
    description: 'List of triggered notice IDs related to this attachment.',
  })
  notice_trigger?: number[];

  @Field(() => Float, {
    nullable: true,
    description: 'Count of sub-payments that were included in the ABA file.',
  })
  included_count?: number;

  @Field(() => Float, {
    nullable: true,
    description:
      'Count of sub-payments that were silently dropped from the ABA file.',
  })
  skipped_count?: number;

  @Field(() => [AbaSkippedPayment], {
    nullable: true,
    description:
      'Sub-payments that were dropped from the ABA file (e.g. missing recipient BSB, account number, or sender APCA).',
  })
  skipped_payments?: AbaSkippedPayment[];

  @Field(() => [AbaSkippedAccount], {
    nullable: true,
    description:
      'Sender bank accounts that were skipped entirely (e.g. missing APCA number).',
  })
  skipped_accounts?: AbaSkippedAccount[];
}

@ObjectType({
  description:
    'Sender bank account row used by the per-account ABA wizard picker.',
})
export class AbaWizardSenderAccount {
  @Field({ description: 'Bank account ID of the sender account.' })
  bank_account_id: number;

  @Field({ description: 'Company ID owning the account.' })
  company_id: number;

  @Field({ nullable: true, description: 'Display name of the bank account.' })
  account_name: string;

  @Field({ nullable: true, description: 'Account number.' })
  account_number: string;

  @Field({ nullable: true, description: 'BSB number (as string).' })
  bsb_number: string;

  @Field(() => Float, { nullable: true, description: 'APCA / Direct entry user ID.' })
  apca_number: number;

  @Field({ description: 'True when the account has a non-null APCA number.' })
  has_apca: boolean;

  @Field(() => Float, {
    description: 'Number of outstanding (unconfirmed) ToDo sub-payments drawn from this account.',
  })
  eligible_count: number;
}

@ObjectType({
  description: 'Response wrapper for the ABA wizard sender-accounts query.',
})
export class GetAbaWizardSenderAccountsResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({ description: 'Response message.' })
  message: string;

  @Field(() => [AbaWizardSenderAccount], { nullable: true, description: 'Sender accounts.' })
  data: AbaWizardSenderAccount[];
}

@ObjectType({
  description: 'A single outstanding sub-payment row for the ABA wizard.',
})
export class AbaWizardOutstandingPayment {
  @Field({ description: 'Sub-payment ID.' })
  sub_payment_id: number;

  @Field({ nullable: true, description: 'Parent payment ID.' })
  payment_id: number;

  @Field({ nullable: true, description: 'Payment type.' })
  payment_type: string;

  @Field({ nullable: true, description: 'Sub-payment type.' })
  sub_payment_type: string;

  @Field({ nullable: true, description: 'Recipient display name.' })
  recipient_name: string;

  @Field({ nullable: true, description: 'Recipient account number.' })
  recipient_account_number: string;

  @Field({ nullable: true, description: 'Recipient BSB.' })
  recipient_bsb: string;

  @Field(() => Float, { nullable: true, description: 'Amount.' })
  amount: number;

  @Field({ nullable: true, description: 'Project name.' })
  project_name: string;

  @Field({ nullable: true, description: 'Contract name.' })
  contract_name: string;

  @Field({ nullable: true, description: 'Due date.' })
  due_date: Date;

  @Field({
    description:
      'True when this row has all required fields to be included in an ABA file.',
  })
  is_eligible: boolean;

  @Field(() => [String], {
    nullable: true,
    description: 'Missing field codes when is_eligible is false.',
  })
  missing_fields: string[];
}

@ObjectType({
  description: 'Response wrapper for the ABA wizard outstanding-payments query.',
})
export class GetAbaWizardOutstandingPaymentsResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({ description: 'Response message.' })
  message: string;

  @Field(() => [AbaWizardOutstandingPayment], { nullable: true })
  data: AbaWizardOutstandingPayment[];
}

@ObjectType({ description: 'Response structure for ABA file generation.' })
export class generateAbaFilesResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({ description: 'Response message.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing details of the generated ABA file.',
  })
  data: FileAttachmenResponse;
}

@ObjectType({ description: 'Auto-populatable fields when adding a payment.' })
export class FetchAutoPopulatableFieldsWhileAddingAPayment {
  @Field({
    nullable: true,
    description: 'Payment claim ID associated with this payment.',
  })
  payment_claim_id: number;

  @Field({ nullable: true, description: 'Type of payment claim.' })
  claim_type: PaymentClaimTypes;

  @Field({ nullable: true, description: 'Total claim amount.' })
  claim_amount: number;

  @Field({
    nullable: true,
    description: 'Formatted claim amount string for display.',
  })
  formatted_claim_amount: string;

  @Field({
    nullable: true,
    description: 'Project ID associated with this payment.',
  })
  project_id: number;

  @Field({ nullable: true, description: 'Name of the project.' })
  project_name: string;

  @Field({
    nullable: true,
    description: 'Contract ID associated with this payment.',
  })
  contract_id: number;

  @Field({ nullable: true, description: 'Contract name.' })
  contract_name: string;

  @Field({ nullable: true, description: 'Due date for the payment.' })
  due_date: Date;

  @Field({ nullable: true, description: 'Date when the payment was sent.' })
  sent_date: Date;

  @Field({ nullable: true, description: 'Date when the payment was received.' })
  received_date: Date;

  @Field(() => Float, {
    nullable: true,
    description: 'GST summary for the payment.',
  })
  gst_summary: number;

  @Field({ nullable: true, description: 'Formatted GST summary for display.' })
  formatted_gst_summary: string;

  @Field(() => Float, {
    nullable: true,
    description: 'Retention ID if applicable.',
  })
  retention_id: number;

  @Field({ nullable: true, description: 'Current status of the payment.' })
  status: string;

  @Field({ nullable: true, description: 'Type of retention applicable.' })
  retention_type: RetentionType;

  @Field({ nullable: true, description: 'ID of the client or supplier.' })
  client_supplier_id: number;

  @Field({ nullable: true, description: 'Name of the client or supplier.' })
  client_supplier_name: string;

  @Field(() => Float, {
    nullable: true,
    description: 'Outstanding payment amount.',
  })
  outstanding_amount: number;

  @Field({
    nullable: true,
    description: 'Formatted outstanding amount for display.',
  })
  formatted_outstanding_amount: string;

  @Field(() => Float, {
    nullable: true,
    description: 'Outstanding retention amount.',
  })
  outstanding_retention_amount: number;

  @Field({
    nullable: true,
    description: 'Formatted outstanding retention amount.',
  })
  formatted_outstanding_retention_amount: string;

  @Field({
    nullable: true,
    description: 'Name of the account from which the payment is made.',
  })
  payment_from_account_name: string;

  @Field({
    nullable: true,
    description: 'BSB number of the payment from account.',
  })
  payment_from_account_bsb_number: string;

  @Field({
    nullable: true,
    description: 'Account number of the payment from account.',
  })
  payment_from_account_number: string;

  @Field({
    nullable: true,
    description: 'ID or reference of the payment from account.',
  })
  payment_from_account: string;

  @Field({
    nullable: true,
    description: 'Name of the account to which the payment is made.',
  })
  payment_to_account_name: string;

  @Field({
    nullable: true,
    description: 'ID or reference of the payment to account.',
  })
  payment_to_account: string;

  @Field({
    nullable: true,
    description: 'BSB number of the payment to account.',
  })
  payment_to_account_bsb_number: string;

  @Field({
    nullable: true,
    description: 'Account number of the payment to account.',
  })
  payment_to_account_number: string;

  @Field({ nullable: true, description: 'Type of cash retention applied.' })
  cash_retention_type: CashRetentionType;

  @Field(() => Float, {
    nullable: true,
    description: 'Payless amount if applicable.',
  })
  payless_amount: number;

  @Field({
    nullable: true,
    description: 'Formatted payless amount for display.',
  })
  formatted_payless_amount: string;

  @Field({ nullable: true, description: 'Status as shown in the UI.' })
  status_in_ui: string;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Buttons and actions available in payment overview UI.',
  })
  payment_overview_buttons: Record<string, any>;

  @Field(() => Float, {
    nullable: true,
    description: 'Retention list ID if applicable.',
  })
  retention_list_id: number;

  @Field(() => Float, {
    nullable: true,
    description: 'Retention from account ID if applicable.',
  })
  retention_from_account: number;

  // Payment details for import
  @Field({
    nullable: true,
    description: 'Type of payment (e.g., standard, sub-payment).',
  })
  payment_type: PaymentTypes;

  @Field({ nullable: true, description: 'Type of client or supplier.' })
  client_supplier_type: string;

  @Field({
    nullable: true,
    description: 'Indicates if cash retention is applied.',
  })
  cash_retention: Boolean;

  @Field({
    nullable: true,
    description: 'Indicates if the claim has retention.',
  })
  has_claim_retention: Boolean;

  @Field({ nullable: true, description: 'Retention percentage applied.' })
  retention_percentage: number;

  @Field({ nullable: true, description: 'Retention amount including GST.' })
  retention_amount_with_gst: number;

  // Conditional fields if cash_retention_type is retention
  @Field(() => Float, { nullable: true, description: 'Retention amount.' })
  retention_amount: number;

  @Field({ nullable: true, description: 'Formatted retention amount.' })
  formatted_retention_amount: string;

  @Field({
    nullable: true,
    description: 'Formatted retention amount including GST.',
  })
  formatted_retention_amount_with_gst: string;

  @Field({
    nullable: true,
    description: 'Retention release date if applicable.',
  })
  retention_release_date: Date;

  @Field(() => Float, { nullable: true, description: 'Payment amount.' })
  payment_amount: number;

  @Field({
    nullable: true,
    description: 'Formatted payment amount for display.',
  })
  formatted_payment_amount: string;

  @Field(() => Float, {
    nullable: true,
    description: 'Total payment amount including GST and adjustments.',
  })
  total_amount: number;

  @Field({ nullable: true, description: 'Date when the payment was made.' })
  payment_date: Date;

  @Field({ nullable: true, description: 'Type of beneficiary.' })
  beneficiary_type: BeneficiaryType;

  @Field({
    nullable: true,
    description: 'Business ID associated with the payment.',
  })
  company_id: number;

  @Field({ nullable: true, description: 'Role of the client or supplier.' })
  client_supplier_role: ClientSupplierRole;

  @Field(() => [FetchInvoiceDetailsOfClaimResponse], {
    nullable: true,
    description: 'Invoices linked to the claim.',
  })
  invoices: FetchInvoiceDetailsOfClaimResponse[];

  @Field({ nullable: true, description: 'Reference of the claim.' })
  claim_reference: string;

  @Field({ nullable: true, description: 'Payment terms for the claim.' })
  payment_terms: string;

  @Field({ nullable: true, description: 'Memo attached to the claim.' })
  claim_memo: string;

  @Field({ nullable: true, description: 'Payment from account type.' })
  payment_from_account_type: string;

  @Field({ nullable: true, description: 'Payment to account type.' })
  payment_to_account_type: string;

  @Field({ nullable: true, description: 'Indicates if GST is optional.' })
  is_gst_optional: boolean;

  @Field({ nullable: true, description: 'Address of the client or supplier.' })
  client_supplier_address: string;

  @Field({ nullable: true, description: 'End date for defect liability.' })
  defect_liability_end_date: Date;

  @Field(() => Float, {
    nullable: true,
    description: 'Claim retention amount.',
  })
  claim_retention_amount: number;

  @Field({ nullable: true, description: 'Formatted claim retention amount.' })
  formatted_claim_retention_amount: string;
}

@ObjectType({ description: 'Invoice details linked to a payment claim.' })
export class FetchInvoiceDetailsOfClaimResponse {
  @Field({ description: 'Description of the invoice item.' })
  description: string;

  @Field(() => Float, { description: 'Quantity of items.' })
  quantity: number;

  @Field(() => Float, { description: 'Unit price of the item.' })
  unit_price: number;

  @Field(() => Float, {
    description: 'GST calculated at 10% of the total amount.',
  })
  gst: number;

  @Field(() => Float, { description: 'Total amount including GST.' })
  total_amount_including_gst: number;

  @Field({ nullable: true, description: 'Associated payment claim ID.' })
  payment_claim_id: number;

  @Field({ nullable: true, description: 'Formatted unit price for display.' })
  formatted_unit_price: string;

  @Field({ nullable: true, description: 'Formatted GST amount for display.' })
  formatted_gst: string;

  @Field({
    nullable: true,
    description: 'Formatted total amount including GST.',
  })
  formatted_total_amount_including_gst: string;
}
@ObjectType({ description: 'Details of all retention amounts in payments.' })
export class FetchAllRetentionInPaymentsList {
  @Field(() => Float, { description: 'Payment ID.' })
  payment_id: number;

  @Field({ description: 'Retention list ID associated with the payment.' })
  retention_list_id: number;

  @Field({ description: 'Sub-payment ID associated with this retention.' })
  sub_payment_id: number;

  @Field({ description: 'Type of payment.' })
  payment_type: PaymentTypes;

  @Field({ description: 'Associated payment claim ID.' })
  payment_claim_id: number;

  @Field({ description: 'Associated project ID.' })
  project_id: number;

  @Field({ nullable: true, description: 'Name of the associated project.' })
  project_name: string;

  @Field({ description: 'Contract ID associated with the payment.' })
  contract_id: number;

  @Field({ description: 'Type of claim associated with the payment.' })
  claim_type: PaymentClaimTypes;

  @Field({ description: 'Type of beneficiary for the retention.' })
  beneficiary_type: BeneficiaryType;

  @Field({ description: 'Type of cash retention if applicable.' })
  cash_retention_type: CashRetentionType;

  @Field({ nullable: true, description: 'Name of the contract.' })
  contract_name: string;

  @Field({ nullable: true, description: 'Name of the beneficiary.' })
  beneficiary_name: string;

  @Field({ description: 'Current status of the retention.' })
  status: string;

  @Field(() => Float, { nullable: true, description: 'Amount retained.' })
  retained_amount: number;

  @Field({
    nullable: true,
    description: 'Formatted retained amount for display.',
  })
  formatted_retained_amount: string;

  @Field({
    nullable: true,
    description: 'Name of the retention trust account.',
  })
  retention_trust_account_name: string;

  @Field(() => Float, {
    nullable: true,
    description: 'ID of the retention account.',
  })
  retention_account_id: number;

  @Field({ nullable: true, description: 'Client or supplier ID.' })
  client_supplier_id: number;

  @Field({ nullable: true, description: 'Date when the payment was sent.' })
  sent_date: Date;

  @Field({ nullable: true, description: 'Date when the payment was received.' })
  received_date: Date;

  @Field({ nullable: true, description: 'Due date for the payment.' })
  due_date: Date;

  @Field({ nullable: true, description: 'Date when the claim was created.' })
  claim_created_on: Date;

  @Field({ nullable: true, description: 'Name of the client or supplier.' })
  client_supplier_name: string;
}

@ObjectType({ description: 'Summary of a retention for a sub-payment.' })
export class FetchRetentionSummary {
  @Field({ description: 'Retention summary record ID.' })
  retention_summary_id: number;

  @Field({ description: 'Retention ID associated with the summary.' })
  retention_id: number;

  @Field({ nullable: true, description: 'Amount retained in this summary.' })
  amount: number;

  @Field({
    nullable: true,
    description: 'Amount of payment applied to this retention.',
  })
  payment_amount: number;

  @Field({ description: 'Current status of the retention summary.' })
  status: RetentionSummaryStatus;

  @Field({ description: 'Sub-payment ID associated with this summary.' })
  sub_payment_id: number;

  @Field({ description: 'Date when the retention was applied.' })
  retained_on: Date;

  @Field({ description: 'Type of retention.' })
  retention_type: RetentionType;

  @Field({ nullable: true, description: 'Name of the beneficiary.' })
  beneficiary_name: string;

  @Field({
    nullable: true,
    description: 'Account name where retention is held.',
  })
  retained_account_name: string;

  @Field({ description: 'Type of the retained account (bank account type).' })
  retained_account_type: BankAccountType;

  @Field({ nullable: true, description: 'Associated event ID, if any.' })
  event_id: number;

  @Field({ nullable: true, description: 'Retention account ID.' })
  retention_account_id: number;

  @Field({
    nullable: true,
    description: 'Date when payment was made against the retention.',
  })
  payment_date: Date;
}

@ObjectType({ description: 'Transactions matched to a payment.' })
export class FetchAllTheMatchedTransactionsOfAPayment {
  @Field({ nullable: true, description: 'Date of the transaction.' })
  transaction_date: Date;

  @Field({
    nullable: true,
    description: 'Description or status of the transaction.',
  })
  description: TransactionStatus;

  @Field(() => Float, { nullable: true, description: 'Transaction amount.' })
  txn_amount: number;

  @Field(() => Float, { nullable: true, description: 'Unique transaction ID.' })
  unique_txn_id: number;
}

@ObjectType({ description: 'Sub-payments for a given payment.' })
export class FetchAllSubPaymentsOfAPayment {
  @Field(() => Float, { description: 'Payment transaction ID.' })
  payment_transaction_id: number;

  @Field({ description: 'Type of sub-payment.' })
  sub_payment_type: SubPaymentTypes;

  @Field(() => Float, { description: 'Amount of the sub-payment.' })
  payment_amount: number;

  @Field({ description: 'Current status of the sub-payment.' })
  status: string;

  @Field({
    nullable: true,
    description: 'Account ID where the payment is sent.',
  })
  payment_to_account_id: number;

  @Field({ nullable: true, description: 'Name of the payment to account.' })
  payment_to_account_name: string;
}

@ObjectType({
  description: 'Retention summary with total count for pagination.',
})
export class FetchRetentionSummaryWithTotalCount {
  @Field(() => [FetchRetentionSummary], {
    nullable: true,
    description: 'List of retention summaries.',
  })
  retention_summary: FetchRetentionSummary[];

  @Field({ description: 'Total number of retention summaries.' })
  total_count: number;
}

@ObjectType({ description: 'Payments to be done in the dashboard view.' })
export class GetListOfAllPaymentsToDoInDashboard {
  @Field({ description: 'Associated project ID.' })
  project_id: number;

  @Field({ nullable: true, description: 'Project name.' })
  project_name: string;

  @Field({ nullable: true, description: 'Associated contract ID.' })
  contract_id: number;

  @Field({ nullable: true, description: 'Contract name.' })
  contract_name: string;

  @Field({ nullable: true, description: 'Amount of the payment.' })
  payment_amount: number;

  @Field({
    nullable: true,
    description: 'Formatted payment amount for display.',
  })
  formatted_payment_amount: string;

  @Field({ nullable: true, description: 'Due date of the payment.' })
  due_date: Date;

  @Field({ description: 'Associated payment claim ID.' })
  payment_claim_id: number;

  @Field({ description: 'Payment ID.' })
  payment_id: number;
}

@ObjectType({
  description:
    'Response structure for list of all payments to do in the dashboard.',
})
export class GetListOfAllPaymentsToDoInDashboardResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({ description: 'Response message.' })
  message: string;

  @Field(() => [GetListOfAllPaymentsToDoInDashboard], {
    nullable: true,
    description: 'List of payments to do.',
  })
  data: GetListOfAllPaymentsToDoInDashboard[];
}

@ObjectType({ description: 'Response for fetching retention summary.' })
export class FetchRetentionSummaryResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({ description: 'Response message.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Retention summary data with total count.',
  })
  data: FetchRetentionSummaryWithTotalCount;
}

@ObjectType({ description: 'Paginated list of all retention in payment list.' })
export class FetchAllRetentionInPaymentListWithCount {
  @Field({ description: 'Total number of retention records.' })
  total_count: number;

  @Field(() => [FetchAllRetentionInPaymentsList], {
    nullable: true,
    description: 'List of all retention in payments.',
  })
  data: FetchAllRetentionInPaymentsList[];
}

@ObjectType({
  description: 'Response for fetching all retention in payment list.',
})
export class FetchAllRetentionInPaymentsListResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({ description: 'Response message.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing list of retentions with total count.',
  })
  data: FetchAllRetentionInPaymentListWithCount;
}

@ObjectType({ description: 'Response after adding a payment.' })
export class AddPaymentResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({ description: 'Response message.' })
  message: string;

  @Field({ nullable: true, description: 'Details of the added payment.' })
  data: AddPayment;
}

@ObjectType({ description: 'Response containing details of a payment.' })
export class FetchDetailsOfAPaymentResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({ description: 'Response message.' })
  message: string;

  @Field({ nullable: true, description: 'Payment details.' })
  data: FetchDetailsOfAPayment;
}

@ObjectType({
  description:
    'Response for fetching auto-populatable fields while adding a payment.',
})
export class FetchAutoPopulatableFieldsWhileAddingAPaymentResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({ description: 'Response message.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Auto-populatable fields for adding a payment.',
  })
  data: FetchAutoPopulatableFieldsWhileAddingAPayment;
}

@ObjectType({ description: 'List of all payments with total count.' })
export class ListAllPaymentsWithCount {
  @Field(() => [FetchDetailsOfAPayment], {
    nullable: true,
    description: 'List of payments.',
  })
  payments: FetchDetailsOfAPayment[];

  @Field({ description: 'Total number of payments.' })
  total_count: number;
}

@ObjectType({ description: 'Response for listing all payments.' })
export class ListAllPaymentsResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({ description: 'Response message.' })
  message: string;

  @Field({ nullable: true, description: 'Payments with total count.' })
  data: ListAllPaymentsWithCount;
}

@ObjectType({ description: 'Details of payments to match with transactions.' })
export class FetchDetailsOfTxnPaymentToMatch {
  @Field(() => [FetchDetailsOfPaymentToMatch], {
    nullable: true,
    description: 'List of payments to match.',
  })
  payments: FetchDetailsOfPaymentToMatch[];

  @Field(() => [FetchAllTransactions], {
    nullable: true,
    description: 'List of transactions for matching.',
  })
  transactions: FetchAllTransactions[];
}

@ObjectType({ description: 'Details of matched payments and transactions.' })
export class FetchDetailsOfTxnPaymentMatched {
  @Field(() => [FetchMatchedPayment], {
    nullable: true,
    description: 'Matched payments.',
  })
  payments: FetchMatchedPayment[];

  @Field(() => [FetchMatchedTxn], {
    nullable: true,
    description: 'Matched transactions.',
  })
  transactions: FetchMatchedTxn[];

  @Field(() => [Number], {
    nullable: true,
    description: 'List of payment IDs matched.',
  })
  payment_Ids: number[];
}

@ObjectType({
  description: 'Details of unmatched payments and related transactions.',
})
export class FetchDetailsOfTxnPaymentUnmatch {
  @Field(() => [FetchDetailsOfPaymentToMatch], {
    nullable: true,
    description: 'Payments not matched.',
  })
  payments: FetchDetailsOfPaymentToMatch[];

  @Field(() => [FetchMatchedTxn], {
    nullable: true,
    description: 'Transactions available for matching.',
  })
  transactions: FetchMatchedTxn[];

  @Field(() => [FetchMatchedTxn], {
    nullable: true,
    description: 'Related transactions to unmatched payments.',
  })
  related_transactions: FetchMatchedTxn[];

  @Field({
    nullable: true,
    description: 'Indicates if the unmatched payments are grouped.',
  })
  groupTxn: boolean;
}

@ObjectType({
  description:
    'Response for listing payments available for transaction matching.',
})
export class ListforMatchingTxnPaymentsResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({ description: 'Response message.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Payments and transactions for matching.',
  })
  data: FetchDetailsOfTxnPaymentToMatch;
}

@ObjectType({ description: 'Response for matched transaction payments.' })
export class MatchedTxnPaymentsResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({ description: 'Response message.' })
  message: string;

  @Field({ nullable: true, description: 'Matched payments and transactions.' })
  data: FetchDetailsOfTxnPaymentMatched;
}

@ObjectType({ description: 'Response for unmatched transaction payments.' })
export class UnMatchTxnPaymentsResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({ description: 'Response message.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Unmatched payments and transactions.',
  })
  data: FetchDetailsOfTxnPaymentUnmatch;
}

@ObjectType({ description: 'Response after deleting transactions.' })
export class deleteTxnsResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({ description: 'Response message.' })
  message: string;
}

@ObjectType({ description: 'Response after editing details of a payment.' })
export class EditDetailsOfAPaymentResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({ description: 'Response message.' })
  message: string;

  @Field({ nullable: true, description: 'Optional notice details.' })
  data?: NoticeDetails;
}

@ObjectType({ description: 'Response after changing the status of a payment.' })
export class ChangeStatusOfAPaymentResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({ description: 'Response message.' })
  message: string;

  @Field({ nullable: true, description: 'New status of the payment.' })
  data: string;
}

@ObjectType({
  description: 'Response containing all matched transactions of a payment.',
})
export class FetchAllTheMatchedTransactionsOfAPaymentResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({ description: 'Response message.' })
  message: string;

  @Field(() => [FetchAllTheMatchedTransactionsOfAPayment], {
    nullable: true,
    description: 'Matched transactions.',
  })
  data: FetchAllTheMatchedTransactionsOfAPayment[];
}

@ObjectType({
  description: 'Response containing all sub-payments of a payment.',
})
export class FetchAllSubPaymentsOfAPaymentResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({ description: 'Response message.' })
  message: string;

  @Field(() => [FetchAllSubPaymentsOfAPayment], {
    nullable: true,
    description: 'List of sub-payments.',
  })
  data: FetchAllSubPaymentsOfAPayment[];
}

@ObjectType({ description: 'Unmatched payment details for a business.' })
export class FetchAllUnmatchedPaymentsOfACompany {
  @Field({ description: 'Unique ID of the unmatched payment.' })
  id: string;

  @Field({ nullable: true, description: 'Payment ID.' })
  payment_id: number;

  @Field({ nullable: true, description: 'Associated payment claim ID.' })
  payment_claim_id: number;

  @Field({ nullable: true, description: 'Sub-payment ID.' })
  sub_payment_id: number;

  @Field({ nullable: true, description: 'Type of sub-payment.' })
  sub_payment_type: SubPaymentTypes;

  @Field({ nullable: true, description: 'Status of the payment.' })
  status: PaymentStatuses;

  @Field({ nullable: true, description: 'Payment amount.' })
  amount: number;

  @Field({ nullable: true, description: 'Formatted payment amount.' })
  formatted_amount: string;

  @Field({ nullable: true, description: 'Bank account ID of the payment.' })
  payment_account: number;

  @Field({ nullable: true, description: 'Name of the account.' })
  account_name: string;

  @Field({ nullable: true, description: 'Type of the bank account.' })
  account_type: BankAccountType;

  @Field({ nullable: true, description: 'Cash retention type if applicable.' })
  cash_retention_type: CashRetentionType;
}

@ObjectType({
  description: 'Response containing all unmatched payments of a business.',
})
export class FetchAllUnmatchedPaymentsOfACompanyResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({ description: 'Response message.' })
  message: string;

  @Field(() => [FetchAllUnmatchedPaymentsOfACompany], {
    nullable: true,
    description: 'List of unmatched payments.',
  })
  data: FetchAllUnmatchedPaymentsOfACompany[];
}

@ObjectType({ description: 'Details of ABA generated file history record.' })
class ABAGeneratedFileHistoryDetail {
  @Field({ description: 'Record ID.' })
  id: string;

  @Field({ description: 'Business ID.' })
  company_id: number;

  @Field({ description: 'Business name.' })
  company_name: string;

  @Field({ description: 'Bank account ID used for ABA file.' })
  bank_account_id: number;

  @Field({ description: 'Bank account name.' })
  account_name: string;

  @Field({ description: 'ABA file ID.' })
  aba_file_id: string;

  @Field({ description: 'Path to the ABA file.' })
  aba_file_path: string;

  @Field({ description: 'Name of the ABA file.' })
  aba_file_name: string;

  @Field({ description: 'Indicates if the ABA file is marked as paid.' })
  mark_paid: boolean;

  @Field({ description: 'Timestamp when the ABA file record was created.' })
  created_on: Date;

  @Field({ description: 'ID of the user who generated the ABA file.' })
  generated_by: number;
}

@ObjectType({ description: 'Paginated ABA generated file history list.' })
class ABAGeneratedFileHistoryObj {
  @Field({ description: 'Total count of ABA generated file history records.' })
  total_count: number;

  @Field(() => [ABAGeneratedFileHistoryDetail], {
    description: 'List of ABA generated file history records.',
  })
  list: ABAGeneratedFileHistoryDetail[];
}

@ObjectType({
  description: 'Response containing all ABA generated file history.',
})
export class FetchAllABAGeneratedFileHistoryResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({ description: 'Response message.' })
  message: string;

  @Field(() => ABAGeneratedFileHistoryObj, {
    nullable: true,
    description: 'ABA file history data.',
  })
  data: ABAGeneratedFileHistoryObj;
}
