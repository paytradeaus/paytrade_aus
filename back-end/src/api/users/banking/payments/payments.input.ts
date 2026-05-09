import { InputType, Field, Int, Float } from '@nestjs/graphql';
import { Group } from 'src/entities/user-details.entity';
import {
  CashRetentionType,
  PaymentClaimTypes,
  PaymentStatus,
  PaymentTypes,
  RetentionListStatus,
} from 'src/libs/@paytrade-types/paytrade-types';

@InputType({ description: 'Input for adding a payment.' })
export class AddPaymentInput {
  @Field({ description: 'ID of the business associated with this payment.' })
  company_id: number;

  @Field({
    nullable: true,
    description: 'Associated payment claim ID, if any.',
  })
  payment_claim_id: number;

  @Field({ nullable: true, description: 'Associated project ID.' })
  project_id: number;

  @Field({ nullable: true, description: 'Associated contract ID.' })
  contract_id?: number;

  @Field({ nullable: true, description: 'Client or supplier ID.' })
  client_supplier_id: number;

  @Field({ nullable: true, description: 'Type of the payment.' })
  payment_type: PaymentTypes;

  @Field({
    nullable: true,
    description: 'Indicates if this payment is cash retention.',
  })
  cash_retention?: Boolean;

  @Field({
    nullable: true,
    description: 'Account ID from which payment is made.',
  })
  payment_from_account: number;

  @Field({
    nullable: true,
    description: 'Account ID to which payment is made.',
  })
  payment_to_account: number;

  @Field({
    nullable: true,
    description: 'Account ID for retention, if applicable.',
  })
  retention_account?: number;

  @Field({ nullable: true, description: 'Previous status of the payment.' })
  previous_status?: string;

  @Field({ nullable: true, description: 'Current status of the payment.' })
  current_status?: string;

  @Field(() => Float, {
    nullable: true,
    description: 'Amount to pay less, if any.',
  })
  payless_amount?: number;

  @Field(() => Float, { nullable: true, description: 'Payment amount.' })
  payment_amount?: number;

  @Field(() => Float, {
    nullable: true,
    description: 'Retention amount for this payment.',
  })
  retention_amount?: number;

  @Field({ nullable: true, description: 'Retention ID, if applicable.' })
  retention_id?: number;

  @Field(() => Float, {
    description: 'Total amount including retention and GST.',
  })
  total_amount: number;

  @Field({ nullable: true, description: 'Date of payment.' })
  payment_date?: Date;

  @Field({ description: 'Input date when the payment record was created.' })
  input_date: Date;

  @Field({ nullable: true, description: 'Date when retention was released.' })
  retention_release_date?: Date;

  @Field({
    nullable: true,
    description: 'Additional notes or memo for the payment.',
  })
  memo?: string;

  @Field({
    nullable: true,
    description: 'Associated payment ID for related payments.',
  })
  associated_payment_id?: number;

  @Field({ nullable: true, description: 'Associated overpayment ID, if any.' })
  associated_overpayment_id?: number;

  @Field({ nullable: true, description: 'Reason for third-party payments.' })
  third_party_payment_reason?: string;

  @Field({
    nullable: true,
    description: 'Indicates if retention is confirmed.',
  })
  is_retention_confirmed?: Boolean;

  @Field({
    nullable: true,
    description: 'Indicates if payment is confirmed as paid.',
  })
  is_paid_confirmed?: Boolean;

  @Field({
    nullable: true,
    description: 'Indicates if payment is confirmed as received.',
  })
  is_received_confirmed?: Boolean;

  @Field(() => [String], {
    nullable: true,
    description: 'IDs of compulsory attachments for this payment.',
  })
  compulsory_attachment_ids?: string[];

  @Field({ nullable: true, description: 'Reason for withholding payment.' })
  withhold_payment_reason?: string;

  @Field({
    nullable: true,
    description: 'ID of the user who created this payment.',
  })
  created_by?: number;

  @Field({
    nullable: true,
    description: 'Timestamp of when the payment record was created.',
  })
  created_on?: Date;

  @Field({ nullable: true, description: 'Group that created the payment.' })
  created_group?: Group;
}

@InputType({ description: 'Input for changing the status of a payment.' })
export class ChangeStatusOfAPaymentInput {
  @Field({ description: 'Payment ID whose status is to be changed.' })
  payment_id: number;

  @Field({ description: 'New status of the payment.' })
  status: string;

  @Field({
    nullable: true,
    description: 'Optional date for when the status change occurred.',
  })
  input_date: Date;
}

@InputType({ description: 'Input for editing the details of a payment.' })
export class EditDetailsOfAPaymentInput {
  @Field({ description: 'Payment ID to edit.' })
  payment_id: number;

  @Field({
    nullable: true,
    description: 'Whether the payment is confirmed as paid.',
  })
  is_paid_confirmed: Boolean;

  @Field({
    nullable: true,
    description: 'Whether the payment is confirmed as received.',
  })
  is_received_confirmed: Boolean;

  @Field({ nullable: true, description: 'Whether retention is confirmed.' })
  is_retention_confirmed: Boolean;

  @Field({
    nullable: true,
    description: 'Indicates whether to delete only paytrade-related data.',
  })
  delete_paytrade_only?: Boolean;
}

@InputType({ description: 'Input for fetching details of a payment.' })
export class FetchDetailsOfAPaymentInput {
  @Field({ description: 'ID of the payment to fetch.' })
  payment_id: number;
}

@InputType({
  description:
    'Input for fetching auto-populatable fields while adding a payment.',
})
export class FetchAutoPopulatableFieldsWhileAddingAPaymentInput {
  @Field({
    description: 'business ID for which to fetch auto-populatable fields.',
  })
  company_id: number;

  @Field({ description: 'Associated payment claim ID.' })
  payment_claim_id: number;

  @Field({ nullable: true, description: 'Optional payment type.' })
  payment_type?: string;

  @Field({
    nullable: true,
    description: 'Optional import ID for prefilled payments.',
  })
  import_id?: string;
}

@InputType({ description: 'Input for listing all payments.' })
export class ListAllPaymentsInput {
  @Field({ description: 'business ID to list payments for.' })
  company_id: number;

  @Field({ nullable: true, description: 'Project ID to filter payments.' })
  project_id: number;

  @Field({ nullable: true, description: 'Contract ID to filter payments.' })
  contract_id: number;

  @Field({
    nullable: true,
    description: 'Client or supplier ID to filter payments.',
  })
  client_supplier_id: number;

  @Field({ nullable: true, description: 'Bank account ID to filter payments.' })
  bank_account_id: number;

  @Field({
    nullable: true,
    description: 'Payment claim ID to filter payments.',
  })
  claim_id: number;

  @Field({ nullable: true, description: 'Specific payment ID to filter.' })
  payment_id: number;

  @Field({ nullable: true, description: 'Filter by cash retention type.' })
  cash_retention_type: CashRetentionType;

  @Field({ nullable: true, description: 'Filter by claim type.' })
  claim_type: PaymentClaimTypes;

  @Field({ nullable: true, description: 'Filter by payment type.' })
  payment_type: string;

  @Field({ nullable: true, description: 'Filter by payment status.' })
  status: string;

  @Field({ nullable: true, description: 'Filter by paid confirmation status.' })
  is_paid_confirmed: Boolean;

  @Field({ nullable: true, description: 'Keyword search.' })
  keyword: string;

  @Field({
    defaultValue: null,
    nullable: true,
    description: 'Pagination: page number.',
  })
  page_number?: number;

  @Field({
    defaultValue: null,
    nullable: true,
    description: 'Pagination: page size.',
  })
  page_size?: number;

  @Field({
    nullable: true,
    description: 'Filter by date type (e.g., payment date, input date).',
  })
  date_filter: string;

  @Field({ nullable: true, description: 'Filter start date.' })
  start_date: Date;

  @Field({ nullable: true, description: 'Filter end date.' })
  end_date: Date;

  @Field({ nullable: true, description: 'Field to sort by.' })
  sorting_field: string;

  @Field({ nullable: true, description: 'Sorting order: ASC or DESC.' })
  sorting_order: 'ASC' | 'DESC';

  @Field({ nullable: true, description: 'Search term.' })
  search: string;
}

@InputType({ description: 'Input for listing all sub-payments of a business.' })
export class ListSubPaymentsInput {
  @Field({ description: 'business ID to list sub-payments for.' })
  company_id: number;

  @Field({ nullable: true, description: 'Project ID to filter sub-payments.' })
  project_id?: number;

  @Field({ nullable: true, description: 'Contract ID to filter sub-payments.' })
  contract_id?: number;

  @Field({
    nullable: true,
    description: 'Bank account ID to filter sub-payments.',
  })
  bank_account_id?: number;

  @Field({
    nullable: true,
    description: 'Client or supplier ID to filter sub-payments.',
  })
  client_supplier_id?: number;

  @Field({
    nullable: true,
    description: 'Type of payment claim to filter sub-payments.',
  })
  claim_type?: PaymentClaimTypes;

  @Field({ nullable: true, description: 'Type of sub-payment (optional).' })
  sub_payment_type?: string;

  @Field({ nullable: true, description: 'Status of the sub-payment.' })
  status?: PaymentStatus;

  @Field({
    nullable: true,
    description: 'Indicates if sub-payment is confirmed.',
  })
  is_confirmed?: Boolean;

  @Field({ nullable: true, description: 'Indicates if sub-payment is late.' })
  is_late?: Boolean;

  @Field({ nullable: true, description: 'Keyword search for sub-payments.' })
  keyword?: string;

  @Field({
    defaultValue: null,
    nullable: true,
    description: 'Pagination: page number.',
  })
  page_number?: number;

  @Field({
    defaultValue: null,
    nullable: true,
    description: 'Pagination: page size.',
  })
  page_size?: number;

  @Field({
    nullable: true,
    description: 'Filter by date type (e.g., input date, payment date).',
  })
  date_filter?: string;

  @Field({
    nullable: true,
    description: 'Filter for marking paid sub-payments.',
  })
  mark_paid?: string;

  @Field({ nullable: true, description: 'Filter start date.' })
  start_date?: Date;

  @Field({ nullable: true, description: 'Filter end date.' })
  end_date?: Date;

  @Field({ nullable: true, description: 'Field to sort by.' })
  sorting_field?: string;

  @Field({ nullable: true, description: 'Sorting order: ASC or DESC.' })
  sorting_order?: 'ASC' | 'DESC';

  @Field(() => [Int], {
    nullable: true,
    description:
      'Optional explicit list of sub_payment_id values to restrict results to (used by the per-account ABA wizard).',
  })
  sub_payment_ids?: number[];
}

@InputType({
  description:
    'Input for the per-sending-account ABA wizard sender-account picker.',
})
export class GetAbaWizardSenderAccountsInput {
  @Field({ description: 'Company ID to list sender accounts for.' })
  company_id: number;
}

@InputType({
  description:
    'Input for the per-sending-account ABA wizard outstanding payments list.',
})
export class GetAbaWizardOutstandingPaymentsInput {
  @Field({ description: 'Company ID.' })
  company_id: number;

  @Field({ description: 'Sender bank account ID.' })
  bank_account_id: number;
}

@InputType({
  description: 'Input for fetching all retention-in payments for a business.',
})
export class FetchAllRetentionInPaymentsListInput {
  @Field({
    nullable: true,
    description: 'Project ID to filter retention payments.',
  })
  project_id?: number;

  @Field({
    nullable: true,
    description: 'Contract ID to filter retention payments.',
  })
  contract_id?: number;

  @Field({ nullable: true, description: 'Filter by retention list status.' })
  status?: RetentionListStatus;

  @Field({ description: 'business ID to fetch retention payments for.' })
  company_id: number;

  @Field({ description: 'Pagination: page number.' })
  page_number: number;

  @Field({
    nullable: true,
    description: 'Pagination: number of items per page.',
  })
  items_per_page?: number;

  @Field({ nullable: true, description: 'Field to sort by.' })
  sorting_field?: string;

  @Field({ nullable: true, description: 'Sorting order: ASC or DESC.' })
  sorting_order?: 'ASC' | 'DESC';
}

@InputType({ description: 'Input for fetching the retention summary.' })
export class FetchRetentionSummaryInput {
  @Field({ description: 'Retention ID to fetch summary for.' })
  retention_id: number;

  @Field({ description: 'Pagination: page number.' })
  page_number: number;

  @Field({ description: 'Pagination: number of items per page.' })
  items_per_page: number;

  @Field({ nullable: true, description: 'Field to sort by.' })
  sorting_field?: string;

  @Field({ nullable: true, description: 'Sorting order: ASC or DESC.' })
  sorting_order?: 'ASC' | 'DESC';

  @Field({ description: 'Filter by status.' })
  status: string;
}

@InputType({
  description: 'Input for fetching all sub-payments of a specific payment.',
})
export class FetchAllSubPaymentsOfAPaymentInput {
  @Field({ description: 'Payment ID to fetch sub-payments for.' })
  payment_id: number;
}

@InputType({
  description: 'Input for fetching all matched transactions of a payment.',
})
export class FetchAllTheMatchedTransactionsOfAPaymentInput {
  @Field({ description: 'Payment ID to fetch matched transactions for.' })
  payment_id: number;
}

@InputType({
  description:
    'Input for fetching the list of all payments to do in dashboard.',
})
export class GetListOfAllPaymentsToDoInDashboardInput {
  @Field({ description: 'business ID to fetch payments to do.' })
  company_id: number;
}

@InputType({ description: 'Input for fetching ABA file history.' })
export class GetABAFileHistoryInput {
  @Field({ description: 'Page number for pagination.' })
  page_number: number;

  @Field({ description: 'business ID to fetch ABA file history.' })
  company_id: number;

  @Field({
    nullable: true,
    description: 'Optional bank account ID to filter ABA history.',
  })
  bank_account_id?: number;

  @Field({ description: 'Number of items per page.' })
  items_per_page: number;

  @Field({ nullable: true, description: 'Field to sort by.' })
  sorting_field?: string;

  @Field({ nullable: true, description: 'Sorting order: ASC or DESC.' })
  sorting_order?: 'ASC' | 'DESC';
}
