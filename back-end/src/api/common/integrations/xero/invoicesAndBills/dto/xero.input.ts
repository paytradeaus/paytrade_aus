import { InputType, Field, PartialType } from '@nestjs/graphql';
import { ClaimReasonInput } from 'src/api/users/banking/payment-claims/payment-claims.input';
import { MappedStatuses } from 'src/libs/@paytrade-types/paytrade-types';

@InputType({
  description:
    'Input for fetching Xero invoices or bills that have already been mapped',
})
export class GetMappedXeroInvoicesListsInput {
  @Field({ description: 'Company identifier for which invoices are retrieved' })
  company_id: number;

  @Field({
    nullable: true,
    defaultValue: 'bill',
    description: 'Type of Xero document: bill or invoice',
  })
  type: 'bill' | 'invoice';

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

  @Field({ nullable: true, description: 'Search keyword to filter invoices' })
  search?: string;

  @Field({ nullable: true, description: 'Field used for sorting the results' })
  sorting_field: string;

  @Field({ nullable: true, description: 'Sorting order: ASC or DESC' })
  sorting_order: 'ASC' | 'DESC';
}

@InputType({
  description:
    'Input for fetching Xero invoices or bills with optional mapped status filter',
})
export class GetXeroInvoicesListsInput {
  @Field({ description: 'Company identifier for which invoices are retrieved' })
  company_id: number;

  @Field({
    nullable: true,
    defaultValue: 'bill',
    description: 'Type of Xero document: bill or invoice',
  })
  type: 'bill' | 'invoice';

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

  @Field({ nullable: true, description: 'Search keyword to filter invoices' })
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
    'Input for fetching Paytrade invoices or bills with optional mapped status filter',
})
export class GetPaytradeInvoicesListsInput {
  @Field({ description: 'Company identifier for which invoices are retrieved' })
  company_id: number;

  @Field({
    nullable: true,
    defaultValue: 'bill',
    description: 'Type of Paytrade document: bill or invoice',
  })
  type: 'bill' | 'invoice';

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

  @Field({ nullable: true, description: 'Search keyword to filter invoices' })
  search?: string;

  @Field({ nullable: true, description: 'Filter by mapped status' })
  mapped_status?: MappedStatuses;

  @Field({ nullable: true, description: 'Field used for sorting the results' })
  sorting_field: string;

  @Field({ nullable: true, description: 'Sorting order: ASC or DESC' })
  sorting_order: 'ASC' | 'DESC';
}

@InputType({
  description: 'Input for specifying invoices that are yet to be mapped',
})
export class YetToMapInvoicesInput {
  @Field({ description: 'Identifier of the Xero invoice to be mapped' })
  invoice_id: string;

  @Field({
    description: 'Paytrade claim identifier to map the Xero invoice to',
  })
  pt_claim_id: number;
}

@InputType({
  description: 'Input for creating a payment claim from a Xero invoice or bill',
})
export class CreateClaimInput {
  @Field({ description: 'Xero invoice identifier' })
  invoice_id: string;

  @Field({ description: 'Tenant identifier in Xero' })
  tenant_id: string;

  @Field({
    nullable: true,
    description: 'Optional sync identifier for tracking',
  })
  sync_id?: string;

  @Field({ nullable: true, description: 'Associated retention ID, if any' })
  retention_id?: number;

  @Field({
    nullable: true,
    description: 'Associated retention sub-payment ID, if any',
  })
  associated_retention_sub_payment_id?: number;

  @Field(() => [ClaimReasonInput], {
    nullable: true,
    description: 'List of claims with reasons',
  })
  claims_with_reason?: ClaimReasonInput[];

  @Field(() => [String], {
    nullable: true,
    description: 'IDs of compulsory attachments',
  })
  compulsory_attachment_ids?: string[];

  @Field({ nullable: true, description: 'Reason for withholding payment' })
  withhold_payment_reason?: string;

  @Field({
    nullable: true,
    description: 'Bank transfer identifier, if applicable',
  })
  bank_transfer_id?: string;

  @Field({
    nullable: true,
    description: 'Credit note identifier, if applicable',
  })
  credit_note_id?: string;

  @Field({ nullable: true, description: 'Sync run type, if applicable' })
  sync_run_type?: string;
}

@InputType({
  description: 'Input for creating an overpayment or underpayment record',
})
export class CreateOverpaymentInput {
  @Field({
    description: 'Identifier of the contact associated with the overpayment',
  })
  contact_id: string;

  @Field({ description: 'Tenant identifier in Xero' })
  tenant_id: string;

  @Field({ nullable: true, description: 'Optional overpayment ID' })
  overpayment_id?: string;

  @Field({
    nullable: true,
    description: 'Optional sync identifier for tracking',
  })
  sync_id?: string;

  @Field({
    nullable: true,
    description: 'Associated project ID, if applicable',
  })
  project_id?: number;

  @Field({
    nullable: true,
    description: 'Associated payment claim ID, if applicable',
  })
  payment_claim_id?: number;

  @Field({
    nullable: true,
    description: 'Associated payment ID, if applicable',
  })
  associated_payment_id?: number;

  @Field({
    nullable: true,
    description: 'Associated overpayment ID, if applicable',
  })
  associated_overpayment_id?: number;

  @Field({
    nullable: true,
    description: 'Flag indicating if this is an underpayment',
  })
  is_under_payment?: boolean;

  @Field({
    nullable: true,
    description: 'Amount of underpayment, if applicable',
  })
  under_payment_amount?: number;

  @Field({ nullable: true, description: 'Sync run type, if applicable' })
  sync_run_type?: string;
}
