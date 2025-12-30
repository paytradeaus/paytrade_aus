import { Field, Float, InputType } from '@nestjs/graphql';
import {
  BeneficiaryType,
  CashRetentionType,
  ClientSupplierType,
  PaymentClaimTypes,
  PaymentTypes,
} from 'src/libs/@paytrade-types/paytrade-types';

@InputType({
  description: 'Input for adding an invoice to a payment claim.',
})
export class AddInvoiceDetailsOfAPaymentClaimInput {
  @Field({ description: 'Description of the invoice item.' })
  description: string;

  @Field(() => Float, { description: 'Quantity of the invoice item.' })
  quantity: number;

  @Field(() => Float, { description: 'Unit price of the invoice item.' })
  unit_price: number;

  @Field(() => Float, {
    description: 'GST amount automatically calculated at 10% of total.',
  })
  gst: number;

  @Field(() => Float, { description: 'Total amount including GST.' })
  total_amount_including_gst: number;

  @Field({ nullable: true, description: 'Associated payment claim ID.' })
  payment_claim_id?: number;

  @Field({ nullable: true, description: 'User ID of creator.' })
  created_by?: number;
}

@InputType({
  description: 'Input for adding a new payment claim.',
})
export class AddPaymentClaimInput {
  @Field({ description: 'Business ID submitting the claim.' })
  company_id: number;

  @Field({ description: 'Type of the payment claim.' })
  claim_type: PaymentClaimTypes;

  @Field({ description: 'Cash retention type.' })
  cash_retention_type: CashRetentionType;

  @Field({ description: 'Status of the claim.' })
  status: string;

  @Field({ nullable: true, description: 'Associated project ID.' })
  project_id?: number;

  @Field({ nullable: true, description: 'Associated contract ID.' })
  contract_id?: number;

  @Field({ description: 'Client or supplier ID linked to the claim.' })
  client_supplier_id: number;

  @Field({ description: 'Type of the client or supplier.' })
  client_supplier_type: ClientSupplierType;

  @Field({ nullable: true, description: 'Due date for payment.' })
  due_date?: Date;

  @Field({
    nullable: true,
    description: 'Sent date for retention-receivable claims.',
  })
  sent_date?: Date;

  @Field({ nullable: true, description: 'Whether all subcontracts are paid.' })
  all_subcontracts_paid?: boolean;

  @Field({ nullable: true, description: 'Whether Section 75 applies.' })
  s75_applicable?: boolean;

  @Field({ nullable: true, description: 'Received date for billable claims.' })
  received_date?: Date;

  @Field(() => [AddInvoiceDetailsOfAPaymentClaimInput], {
    nullable: true,
    description: 'List of invoices associated with the claim.',
  })
  invoices?: AddInvoiceDetailsOfAPaymentClaimInput[];

  @Field(() => [String], {
    nullable: true,
    description: 'Associated notice IDs.',
  })
  notice_ids?: string[];

  @Field({ nullable: true, description: 'Optional reference for the claim.' })
  claim_reference?: string;

  @Field(() => Float, {
    nullable: true,
    description: 'Associated retention sub-payment ID.',
  })
  associated_retention_sub_payment_id?: number;

  @Field(() => Float, { nullable: true, description: 'Retention ID.' })
  retention_id?: number;

  @Field(() => Float, { description: 'Total claim amount.' })
  claim_amount: number;

  @Field({ nullable: true, description: 'Optional memo for the claim.' })
  memo?: string;

  @Field(() => [String], {
    nullable: true,
    description: 'Compulsory attachments for the claim.',
  })
  compulsory_attachment_ids?: string[];

  @Field(() => [String], {
    nullable: true,
    description: 'Optional attachments for the claim.',
  })
  optional_attachment_ids?: string[];

  @Field(() => [String], {
    nullable: true,
    description: 'Optional supporting statement attachments.',
  })
  optional_supporting_statement_attachment_ids?: string[];

  @Field({ nullable: true, description: 'User ID of the creator.' })
  created_by?: number;

  @Field({ nullable: true, description: 'Whether GST is optional.' })
  is_gst_optional?: boolean;

  @Field({ nullable: true, description: 'Beneficiary type for the claim.' })
  beneficiary_type?: BeneficiaryType;

  @Field({ nullable: true, description: 'Payment type (if applicable).' })
  payment_type?: PaymentTypes;

  @Field({
    nullable: true,
    description: 'Payment ID if this claim is linked to a payment.',
  })
  payment_id?: number;

  @Field({ nullable: true, description: 'Whether this is a cash retention.' })
  cash_retention?: boolean;

  @Field({ nullable: true, description: 'Retention amount.' })
  retention_amount?: number;

  @Field({ nullable: true, description: 'Retention percentage.' })
  retention_percentage?: number;

  @Field({ nullable: true, description: 'Retention amount including GST.' })
  retention_amount_with_gst?: number;

  @Field(() => [ClaimReasonInput], {
    nullable: true,
    description: 'Pending claims with reasons.',
  })
  pending_claims_with_reason?: ClaimReasonInput[];
}
@InputType({
  description: 'Input for editing details of an existing payment claim.',
})
export class EditDetailsOfAPaymentClaimInput {
  @Field({ description: 'ID of the payment claim to edit.' })
  payment_claim_id: number;

  @Field({ description: 'Business ID associated with the payment claim.' })
  company_id: number;

  @Field({ nullable: true, description: 'New status of the claim.' })
  status?: string;

  @Field({ nullable: true, description: 'Previous status of the claim.' })
  previous_status?: string;

  @Field({ nullable: true, description: 'Associated project ID.' })
  project_id?: number;

  @Field({ nullable: true, description: 'Associated contract ID.' })
  contract_id?: number;

  @Field({ nullable: true, description: 'Client or supplier ID.' })
  client_supplier_id?: number;

  @Field({ nullable: true, description: 'Type of the client or supplier.' })
  client_supplier_type?: ClientSupplierType;

  @Field({ nullable: true, description: 'Due date for payment.' })
  due_date?: Date;

  @Field({
    nullable: true,
    description: 'Sent date for retention-receivable claims.',
  })
  sent_date?: Date;

  @Field({ nullable: true, description: 'Received date for billable claims.' })
  received_date?: Date;

  @Field(() => [AddInvoiceDetailsOfAPaymentClaimInput], {
    nullable: true,
    description: 'List of invoices for the claim.',
  })
  invoices?: AddInvoiceDetailsOfAPaymentClaimInput[];

  @Field(() => [String], {
    nullable: true,
    description: 'Associated notice IDs.',
  })
  notice_ids?: string[];

  @Field({ nullable: true, description: 'Optional claim reference.' })
  claim_reference?: string;

  @Field(() => Float, { nullable: true, description: 'Claim amount.' })
  claim_amount?: number;

  @Field({ nullable: true, description: 'Optional memo.' })
  memo?: string;

  @Field(() => [String], {
    nullable: true,
    description: 'Compulsory attachment IDs.',
  })
  compulsory_attachment_ids?: string[];

  @Field(() => [String], {
    nullable: true,
    description: 'Optional attachment IDs.',
  })
  optional_attachment_ids?: string[];

  @Field(() => [String], {
    nullable: true,
    description: 'Optional supporting statement attachments.',
  })
  optional_supporting_statement_attachment_ids?: string[];

  @Field({ nullable: true, description: 'Whether GST is optional.' })
  is_gst_optional?: boolean;

  @Field({ nullable: true, description: 'Beneficiary type of the claim.' })
  beneficiary_type?: BeneficiaryType;

  @Field({ nullable: true, description: 'Payment ID linked to the claim.' })
  payment_id?: number;

  @Field({ nullable: true, description: 'Payment type.' })
  payment_type?: PaymentTypes;

  @Field({
    nullable: true,
    description: 'Indicates if the claim is a cash retention.',
  })
  cash_retention?: boolean;

  @Field({ nullable: true, description: 'Retention amount.' })
  retention_amount?: number;

  @Field({ nullable: true, description: 'Retention percentage.' })
  retention_percentage?: number;

  @Field({ nullable: true, description: 'Retention amount including GST.' })
  retention_amount_with_gst?: number;

  @Field(() => Float, {
    nullable: true,
    description: 'Associated retention sub-payment ID.',
  })
  associated_retention_sub_payment_id?: number;

  @Field(() => Float, { nullable: true, description: 'Retention ID.' })
  retention_id?: number;

  @Field({ nullable: true, description: 'Cash retention type.' })
  cash_retention_type?: CashRetentionType;

  @Field({
    nullable: true,
    description: 'Optional sync ID for backend processing.',
  })
  sync_id?: string;

  @Field(() => [ClaimReasonInput], {
    nullable: true,
    description: 'Pending claims with reasons.',
  })
  pending_claims_with_reason?: ClaimReasonInput[];

  @Field({
    nullable: true,
    description: 'Whether all subcontracts have been paid.',
  })
  all_subcontracts_paid?: boolean;
}

@InputType({
  description: 'Input type for changing the status of a payment claim.',
})
export class ChangeStatusOfPaymentClaimInput {
  @Field({ description: 'ID of the payment claim to update.' })
  payment_claim_id: number;

  @Field({ description: 'New status value to set for the payment claim.' })
  status: string;
}

@InputType({
  description:
    'Input for fetching all payment claims of a business with optional filters and pagination.',
})
export class FetchAllPaymentClaimsOfACompanyInput {
  @Field({ description: 'Business ID.' })
  company_id: number;

  @Field({ nullable: true, description: 'Filter by claim type.' })
  claim_type?: PaymentClaimTypes;

  @Field({ nullable: true, description: 'Filter by cash retention type.' })
  cash_retention_type?: CashRetentionType;

  @Field({ nullable: true, description: 'Filter by claim status.' })
  status?: string;

  @Field({ nullable: true, description: 'Filter by project ID.' })
  project_id?: number;

  @Field({ nullable: true, description: 'Filter by contract ID.' })
  contract_id?: number;

  @Field({ nullable: true, description: 'Filter by client/supplier ID.' })
  client_supplier_id?: number;

  @Field({
    defaultValue: null,
    nullable: true,
    description: 'Page number for pagination.',
  })
  page?: number;

  @Field({
    defaultValue: null,
    nullable: true,
    description: 'Number of items per page.',
  })
  items_per_page?: number;

  @Field({ nullable: true, description: 'Field to sort results by.' })
  sorting_field?: string;

  @Field({ nullable: true, description: 'Sorting order: ASC or DESC.' })
  sorting_order?: 'ASC' | 'DESC';

  @Field({
    nullable: true,
    description: 'Search keyword for filtering claims.',
  })
  search?: string;

  @Field({ nullable: true, description: 'Date filter type (optional).' })
  date_filter?: string;

  @Field({ nullable: true, description: 'Start date for filtering.' })
  start_date?: Date;

  @Field({ nullable: true, description: 'End date for filtering.' })
  end_date?: Date;
}

@InputType({
  description:
    'Input for fetching sub-contractor claims with optional pagination.',
})
export class FetchSubContractorClaimsInput {
  @Field({ nullable: true, description: 'Project ID for filtering.' })
  project_id?: number;

  @Field({ nullable: true, description: 'Specific claim ID to filter.' })
  claim_id?: number;

  @Field({
    defaultValue: null,
    nullable: true,
    description: 'Page number for pagination.',
  })
  page?: number;

  @Field({
    defaultValue: null,
    nullable: true,
    description: 'Number of items per page.',
  })
  items_per_page?: number;
}

@InputType({
  description: 'Input to fetch details of a specific payment claim.',
})
export class FetchDetailsOfAPaymentClaimInput {
  @Field({ description: 'Business ID.' })
  company_id: number;

  @Field({ description: 'Payment claim ID to fetch details for.' })
  payment_claim_id: number;
}

@InputType({
  description: 'Input to change the status of a payment claim.',
})
export class ChangeStatusOfAPaymentClaimInput {
  @Field({ description: 'Payment claim ID.' })
  payment_claim_id: number;

  @Field({ description: 'New status of the claim.' })
  status: string;

  @Field({ nullable: true, description: 'Previous status of the claim.' })
  previous_status?: string;
}

@InputType({
  description:
    'Input for fetching list of payment-to-account entries for a selected supplier.',
})
export class FetchPaymentToAccountListOfSelectedSupplierInput {
  @Field({ description: 'Client or supplier ID.' })
  client_supplier_id: number;

  @Field({ description: 'Contract ID.' })
  contract_id: number;

  @Field({ description: 'Payment ID.' })
  payment_id: number;
}

@InputType({
  description:
    'Input for getting available action buttons for a claim or payment.',
})
export class GetListActionButtonsInput {
  @Field({ nullable: true, description: 'Payment claim ID.' })
  payment_claim_id?: number;

  @Field({ nullable: true, description: 'Payment ID.' })
  payment_id?: number;
}

@InputType({
  description:
    'Input to check completion status of associated retention claims.',
})
export class CheckCompletionStatusOfAssociatedRetentionClaimsInput {
  @Field({ description: 'Retention ID.' })
  retention_id: number;
}

@InputType({
  description:
    'Input to fetch fields automatically populated for a retention claim.',
})
export class FetchAutoPopulatableFieldsOfARetentionClaimInput {
  @Field({ description: 'Client or supplier ID.' })
  client_supplier_id: number;

  @Field({ description: 'Contract ID.' })
  contract_id: number;
}

@InputType({
  description: 'Input for providing a reason for a claim.',
})
export class ClaimReasonInput {
  @Field({ description: 'Payment claim ID.' })
  payment_claim_id: number;

  @Field({ nullable: true, description: 'Reason text for the claim.' })
  reason?: string;
}

@InputType({
  description: 'Input for generating a Section 75 notice for a project.',
})
export class GenerateS75NoticeInput {
  @Field({ description: 'Project ID.' })
  project_id: number;

  @Field({ description: 'New claim ID to link with the notice.' })
  new_claim_id: number;

  @Field(() => [ClaimReasonInput], {
    description: 'List of claims with reasons to be included.',
  })
  claims_with_reason: ClaimReasonInput[];
}
