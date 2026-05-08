import { InputType, Field, PartialType, Float } from '@nestjs/graphql';
import { MappedStatuses } from 'src/libs/@paytrade-types/paytrade-types';

@InputType({ description: 'Input for creating a payment record' })
export class CreatePaymentInput {
  @Field({ description: 'Identifier of the payment' })
  payment_id: number;

  @Field({
    nullable: true,
    description: 'Bank account ID associated with the payment',
  })
  bank_account_id?: number;

  @Field({ nullable: true, description: 'Retention account ID, if applicable' })
  retention_account?: number;

  @Field(() => Float, { nullable: true, description: 'Payment amount' })
  amount?: number;

  @Field(() => Float, {
    nullable: true,
    description: 'Retention amount, if applicable',
  })
  retention_amount?: number;

  @Field({ nullable: true, description: 'Date when the payment was made' })
  payment_date?: Date;

  @Field({
    nullable: true,
    description: 'Flag indicating if this is a cash retention payment',
  })
  cash_retention?: Boolean;

  @Field({
    nullable: true,
    description: 'Optional sync identifier for tracking purposes',
  })
  sync_id?: string;

  @Field({
    nullable: true,
    description:
      'Task #50 — When false, skip pushing the Xero Payment leg (only the BankTransfer leg fires). Default true.',
  })
  sync_payment?: boolean;

  @Field({
    nullable: true,
    description:
      'Task #50 — When false, skip pushing the Xero BankTransfer leg (only the Payment leg fires). Default true (when cash_retention=true).',
  })
  sync_transfer?: boolean;

  @Field({
    nullable: true,
    description:
      'Task #50 — Existing Xero BankTransferID, if a previous webhook already attached one (used to bypass re-creation).',
  })
  bank_transfer_id?: string;
}

@InputType({ description: 'Input for creating an overpayment record' })
export class CreateOverPaymentInput {
  @Field({ description: 'Identifier of the payment' })
  payment_id: number;

  @Field({
    nullable: true,
    description: 'Bank account ID associated with the overpayment',
  })
  bank_account_id?: number;

  @Field(() => Float, { nullable: true, description: 'Overpayment amount' })
  amount?: number;

  @Field({ nullable: true, description: 'Date when the overpayment was made' })
  payment_date?: Date;

  @Field({
    nullable: true,
    description: 'Optional sync identifier for tracking purposes',
  })
  sync_id?: string;
}

@InputType({ description: 'Input for creating a refund for an overpayment' })
export class CreateOverPaymentRefundInput {
  @Field({ description: 'Identifier of the payment' })
  payment_id: number;

  @Field({
    nullable: true,
    description: 'Identifier of the overpayment to refund',
  })
  overpayment_id: number;

  @Field({
    nullable: true,
    description: 'Optional sync identifier for tracking purposes',
  })
  sync_id?: string;
}

@InputType({ description: 'Input for deleting a payment record' })
export class DeletePaymentInput {
  @Field({ description: 'Identifier of the payment to delete' })
  payment_id: number;

  @Field({
    nullable: true,
    description: 'Bank account ID associated with the payment',
  })
  bank_account_id?: number;

  @Field({ nullable: true, description: 'Retention account ID, if applicable' })
  retention_account?: number;

  @Field(() => Float, {
    nullable: true,
    description: 'Retention amount, if applicable',
  })
  retention_amount?: number;

  @Field({
    nullable: true,
    description: 'Flag indicating if this is a cash retention payment',
  })
  cash_retention?: Boolean;

  @Field({
    nullable: true,
    description: 'Optional sync identifier for tracking purposes',
  })
  sync_id?: string;

  @Field({
    nullable: true,
    description:
      'Task #52 — When false, skip deleting the Xero Payment leg (only the BankTransfer reversal fires). Default true.',
  })
  delete_payment?: boolean;

  @Field({
    nullable: true,
    description:
      'Task #52 — When false, skip reversing the Xero BankTransfer leg (only the Payment delete fires). Default true (when cash_retention=true).',
  })
  delete_transfer?: boolean;
}

@InputType({ description: 'Input for deleting an overpayment record' })
export class DeleteOverPaymentInput {
  @Field({
    description: 'Identifier of the payment associated with the overpayment',
  })
  payment_id: number;

  @Field({
    nullable: true,
    description: 'Optional sync identifier for tracking purposes',
  })
  sync_id?: string;
}

@InputType({ description: 'Input for deleting a refund of an overpayment' })
export class DeleteOverPaymentRefundInput {
  @Field({
    description:
      'Identifier of the payment associated with the overpayment refund',
  })
  payment_id: number;

  @Field({
    nullable: true,
    description: 'Optional sync identifier for tracking purposes',
  })
  sync_id?: string;
}

@InputType({ description: 'Input for creating a credit note' })
export class CreateCreditNotesInput {
  @Field({ description: 'Company ID associated with the credit note' })
  company_id: number;

  @Field({
    nullable: true,
    description: 'Client or supplier ID for the credit note',
  })
  client_supplier_id: number;

  @Field({
    nullable: true,
    description: 'Associated payment claim ID, if applicable',
  })
  payment_claim_id?: number;

  @Field({ nullable: true, description: 'Paytrade payment ID, if applicable' })
  pt_payment_id?: number;

  @Field({
    nullable: true,
    description: 'Payment ID for which credit note is created',
  })
  payment_id: string;

  @Field(() => Float, {
    nullable: true,
    description: 'Retained amount in the credit note',
  })
  retained_amount?: number;

  @Field({
    nullable: true,
    description: 'Description or note for the credit note',
  })
  description?: string;

  @Field({ nullable: true, description: 'Flag indicating if GST is optional' })
  is_gst_optional?: Boolean;

  @Field({
    nullable: true,
    description: 'Optional sync identifier for tracking purposes',
  })
  sync_id?: string;
}

@InputType({ description: 'Input for deleting a credit note' })
export class DeleteCreditNotesInput {
  @Field({
    description: 'Payment ID associated with the credit note to delete',
  })
  payment_id: number;

  @Field({
    nullable: true,
    description: 'Optional sync identifier for tracking purposes',
  })
  sync_id?: string;
}

@InputType({
  description: 'Input for fetching Xero payments that are already mapped',
})
export class GetMappedXeroPaymentListsInput {
  @Field({ description: 'Company identifier for which payments are retrieved' })
  company_id: number;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Page number for pagination',
  })
  page_number?: number;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Number of records per page',
  })
  page_size?: number;

  @Field({ nullable: true, description: 'Search keyword to filter payments' })
  search?: string;

  @Field({ nullable: true, description: 'Field used for sorting the results' })
  sorting_field: string;

  @Field({ nullable: true, description: 'Sorting order: ASC or DESC' })
  sorting_order: 'ASC' | 'DESC';
}

@InputType({
  description:
    'Input for fetching Xero payments with optional mapped status filter',
})
export class GetXeroPaymentListsInput {
  @Field({ description: 'Company identifier for which payments are retrieved' })
  company_id: number;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Page number for pagination',
  })
  page_number?: number;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Number of records per page',
  })
  page_size?: number;

  @Field({ nullable: true, description: 'Search keyword to filter payments' })
  search?: string;

  @Field({ nullable: true, description: 'Filter by mapped status' })
  mapped_status: MappedStatuses;

  @Field({ nullable: true, description: 'Field used for sorting the results' })
  sorting_field: string;

  @Field({ nullable: true, description: 'Sorting order: ASC or DESC' })
  sorting_order: 'ASC' | 'DESC';
}

@InputType({
  description:
    'Input for fetching Paytrade payments with optional mapped status filter',
})
export class GetPaytradePaymentListsInput {
  @Field({ description: 'Company identifier for which payments are retrieved' })
  company_id: number;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Page number for pagination',
  })
  page_number?: number;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Number of records per page',
  })
  page_size?: number;

  @Field({ nullable: true, description: 'Search keyword to filter payments' })
  search?: string;

  @Field({ nullable: true, description: 'Filter by mapped status' })
  mapped_status?: MappedStatuses;

  @Field({ nullable: true, description: 'Field used for sorting the results' })
  sorting_field: string;

  @Field({ nullable: true, description: 'Sorting order: ASC or DESC' })
  sorting_order: 'ASC' | 'DESC';
}

@InputType({
  description: 'Input for specifying payments that are yet to be mapped',
})
export class YetToMapPaymentsInput {
  @Field({ description: 'Payment ID in Xero' })
  payment_id: string;

  @Field({ description: 'Corresponding Paytrade payment ID to map to' })
  pt_payment_id: number;
}
