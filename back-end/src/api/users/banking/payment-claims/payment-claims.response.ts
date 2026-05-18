import { Field, Float, ObjectType } from '@nestjs/graphql';
import {
  BankAccountType,
  BeneficiaryType,
  CashRetentionType,
  ClientSupplierType,
  NoticeStatus,
  NoticeTypes,
  PaymentClaimTypes,
  PaymentTypes,
} from 'src/libs/@paytrade-types/paytrade-types';
import { FetchInvoiceDetailsOfAPaymentClaimResponse } from '../payment-claims/invoice-details/invoice-details.response';
import { GraphQLJSONObject } from 'graphql-type-json';
import { Filedetails } from '../../signup/response/auth.response';
import { TriggerNoticesData } from '../../notices/notices.response';
import { ProjectRole } from 'src/entities/project-details.entity';
import { ClientSupplierRole } from 'src/entities/contract-details.entity';
import { ApiStatusType } from 'src/libs/@response-framer/response-framer';

@ObjectType({
  description: 'Response object returned after adding a payment claim.',
})
export class AddPaymentClaim {
  @Field({
    description: 'Unique identifier of the newly created payment claim.',
  })
  payment_claim_id: number;

  @Field(() => TriggerNoticesData, {
    nullable: true,
    description:
      'Optional notices triggered as part of the payment claim creation.',
  })
  notices?: TriggerNoticesData;
}

@ObjectType({
  description:
    'Response object returned after editing an existing payment claim.',
})
export class EditPaymentClaim {
  @Field({ description: 'Unique identifier of the edited payment claim.' })
  payment_claim_id: number;

  @Field(() => TriggerNoticesData, {
    nullable: true,
    description:
      'Optional notices triggered as part of the payment claim update.',
  })
  notices?: TriggerNoticesData;
}

@ObjectType({
  description:
    'Detailed information of a specific payment claim, including invoices, payment accounts, and retention details.',
})
export class FetchDetailsOfAPaymentClaim {
  @Field({ description: 'Unique identifier of the payment claim.' })
  payment_claim_id: number;

  @Field({ description: 'Type of the payment claim.' })
  claim_type: PaymentClaimTypes;

  @Field({ description: 'Type of cash retention applicable, if any.' })
  cash_retention_type: CashRetentionType;

  @Field({ description: 'Current status of the payment claim.' })
  status: string;

  @Field({ nullable: true, description: 'Optional list status of the claim.' })
  list_status?: string;

  @Field({ nullable: true, description: 'Associated project ID.' })
  project_id?: number;

  @Field({ nullable: true, description: 'Associated project name.' })
  project_name?: string;

  @Field({ nullable: true, description: 'Role of the user in the project.' })
  project_role?: ProjectRole;

  @Field({ nullable: true, description: 'Associated contract ID.' })
  contract_id?: number;

  @Field({ nullable: true, description: 'Associated contract name.' })
  contract_name?: string;

  @Field({ nullable: true, description: 'Client or supplier ID.' })
  client_supplier_id?: number;

  @Field({ nullable: true, description: 'Client or supplier name.' })
  client_supplier_name?: string;

  @Field({ nullable: true, description: 'Role of the client or supplier.' })
  client_supplier_role?: ClientSupplierRole;

  @Field({ nullable: true, description: 'Type of client or supplier.' })
  client_supplier_type?: ClientSupplierType;

  @Field({ nullable: true, description: 'Payment terms.' })
  payment_terms?: string;

  @Field({ nullable: true, description: 'Address of the client or supplier.' })
  client_supplier_address?: string;

  @Field({
    nullable: true,
    description: 'Payment account type from which payment is made.',
  })
  payment_from_account_type?: string;

  @Field({
    nullable: true,
    description: 'Payment account name from which payment is made.',
  })
  payment_from_account_name?: string;

  @Field({ nullable: true, description: 'BSB number of the payment account.' })
  payment_from_account_bsb_number?: string;

  @Field({
    nullable: true,
    description: 'Account number of the payment account.',
  })
  payment_from_account_number?: string;

  @Field(() => [FetchInvoiceDetailsOfAPaymentClaimResponse], {
    nullable: true,
    description: 'List of invoices associated with the claim.',
  })
  invoices?: FetchInvoiceDetailsOfAPaymentClaimResponse[];

  @Field({
    nullable: true,
    description: 'Payment account type to which the payment is sent.',
  })
  payment_to_account_type?: string;

  @Field({
    nullable: true,
    description: 'Payment account name to which the payment is sent.',
  })
  payment_to_account_name?: string;

  @Field({
    nullable: true,
    description: 'BSB number of the recipient account.',
  })
  payment_to_account_bsb_number?: string;

  @Field({
    nullable: true,
    description: 'Associated retention sub-payment ID.',
  })
  associated_retention_sub_payment_id?: number;

  @Field({
    nullable: true,
    description: 'Retention ID associated with the claim.',
  })
  retention_id?: number;

  @Field({ nullable: true, description: 'Amount retained from the payment.' })
  retained_amount?: number;

  @Field({
    nullable: true,
    description: 'Account number to which the payment is sent.',
  })
  payment_to_account_number?: string;

  @Field({ nullable: true, description: 'Due date of the payment claim.' })
  due_date?: Date;

  @Field({ nullable: true, description: 'Date the payment claim was sent.' })
  sent_date?: Date;

  @Field({
    nullable: true,
    description: 'Date the payment claim was received.',
  })
  received_date?: Date;

  @Field({
    nullable: true,
    description: 'Reference associated with the claim.',
  })
  claim_reference?: string;

  @Field({ nullable: true, description: 'Subtotal summary of all invoices.' })
  sub_total_summary?: number;

  @Field({ nullable: true, description: 'GST summary of all invoices.' })
  gst_summary?: number;

  @Field(() => Float, { nullable: true, description: 'Total claim amount.' })
  claim_amount?: number;

  @Field(() => [String], {
    nullable: true,
    description: 'List of notice IDs associated with the claim.',
  })
  notice_ids?: string[];

  @Field({
    nullable: true,
    description: 'Memo or notes associated with the claim.',
  })
  memo?: string;

  @Field({
    nullable: true,
    description: 'UI status representation for frontend purposes.',
  })
  status_in_ui?: string;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Overview buttons metadata for the claim.',
  })
  claim_overview_buttons?: Record<string, any>;

  @Field({ description: 'Timestamp when the claim was created.' })
  created_on: Date;

  @Field({
    nullable: true,
    description: 'Initial contract sum at claim creation.',
  })
  initial_contract_sum?: number;

  @Field({
    nullable: true,
    description: 'Variation amount associated with the claim.',
  })
  variation_amount?: number;

  @Field({ nullable: true, description: 'Previous claim amount if any.' })
  previous_claim_amount?: number;

  @Field({ nullable: true, description: 'Beneficiary type for the claim.' })
  beneficiary_type?: BeneficiaryType;

  @Field({ nullable: true, description: 'Indicates if GST is optional.' })
  is_gst_optional?: boolean;

  @Field({
    nullable: true,
    description: 'Indicates if all subcontracts are paid.',
  })
  all_subcontracts_paid?: boolean;

  @Field({ nullable: true, description: 'Indicates if S75 applies.' })
  s75_applicable?: boolean;

  @Field({
    nullable: true,
    description: 'Indicates if cash retention applies.',
  })
  cash_retention?: Boolean;

  @Field({ nullable: true, description: 'Amount retained.' })
  retention_amount?: number;

  @Field({ nullable: true, description: 'Percentage retained.' })
  retention_percentage?: number;

  @Field({ nullable: true, description: 'Retention amount including GST.' })
  retention_amount_with_gst?: number;
}

@ObjectType({ description: 'Payment details linked to a payment claim.' })
export class PaymentDetailsinPaymentClaimsList {
  @Field({ description: 'Unique identifier of the payment.' })
  payment_id: number;

  @Field({ nullable: true, description: 'Type of the payment.' })
  payment_type?: PaymentTypes;
}

@ObjectType({ description: 'Notice details associated with a payment claim.' })
export class FetchedNoticesOfClaim {
  @Field({ description: 'Unique identifier of the notice.' })
  notice_id: string;

  @Field({ description: 'Type of the notice.' })
  notice_type: NoticeTypes;

  @Field({ description: 'Current status of the notice.' })
  status: NoticeStatus;
}

@ObjectType({ description: 'Details of a S75 template file.' })
export class s75TemplateFileDetails {
  @Field({ nullable: true, description: 'Unique identifier of the file.' })
  id?: string;

  @Field({ nullable: true, description: 'Name of the file.' })
  file_name?: string;

  @Field({ nullable: true, description: 'Path to the file.' })
  file_path?: string;

  @Field({
    nullable: true,
    description: 'Base64 or other encoded file content.',
  })
  file?: string;
}

@ObjectType({ description: 'Response wrapper for S75 template file details.' })
export class s75TemplateFileDetailsResponse {
  @Field({ description: 'Operation status (e.g., SUCCESS, ERROR).' })
  status: string;

  @Field({ description: 'Human-readable response message.' })
  message: string;

  @Field({ nullable: true, description: 'S75 template file details.' })
  data?: s75TemplateFileDetails;
}

@ObjectType({ description: 'Payment claim summary for listing purposes.' })
export class FetchAllPaymentClaims {
  @Field({ description: 'Unique identifier of the payment claim.' })
  payment_claim_id: number;

  @Field({ description: 'Type of the payment claim.' })
  claim_type: PaymentClaimTypes;

  @Field({ nullable: true, description: 'Type of cash retention applied.' })
  cash_retention_type?: CashRetentionType;

  @Field({ nullable: true, description: 'Beneficiary type of the claim.' })
  beneficiary_type?: BeneficiaryType;

  @Field({ nullable: true, description: 'ID of the client or supplier.' })
  client_supplier_id?: number;

  @Field({ nullable: true, description: 'Name of the client or supplier.' })
  client_supplier_name?: string;

  @Field({ nullable: true, description: 'Associated project ID.' })
  project_id?: number;

  @Field(() => [PaymentDetailsinPaymentClaimsList], {
    nullable: true,
    description: 'Payments linked to this claim.',
  })
  payments?: PaymentDetailsinPaymentClaimsList[];

  @Field({ nullable: true, description: 'Associated project name.' })
  project_name?: string;

  @Field({ nullable: true, description: 'Associated contract ID.' })
  contract_id?: number;

  @Field({ nullable: true, description: 'Associated contract name.' })
  contract_name?: string;

  @Field({ nullable: true, description: 'Due date for the claim.' })
  due_date?: Date;

  @Field(() => Float, { nullable: true, description: 'Claim amount.' })
  claim_amount?: number;

  @Field({
    nullable: true,
    description: 'Formatted claim amount for display purposes.',
  })
  formatted_claim_amount?: string;

  @Field({ description: 'Current status of the claim.' })
  status: string;

  @Field({
    nullable: true,
    description: 'List status of the claim for UI purposes.',
  })
  list_status?: string;

  @Field({
    nullable: true,
    description: 'User-supplied reference for the payment claim.',
  })
  claim_reference?: string;

  @Field({ nullable: true, description: 'Date when the claim was made.' })
  claim_date?: Date;

  @Field(() => [FetchedNoticesOfClaim], {
    nullable: true,
    description: 'Notices associated with this claim.',
  })
  notices?: FetchedNoticesOfClaim[];

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'UI metadata for claim list buttons.',
  })
  claim_list_buttons?: Record<string, any>;
}

@ObjectType({ description: 'Payment from account details for a contract.' })
export class FetchPaymentFromAccountDetailsOfContract {
  @Field({ nullable: true, description: 'Name of the payment from account.' })
  payment_from_account_name?: string;

  @Field({ description: 'ID of the payment from account.' })
  payment_from_account_id: number;

  @Field({ description: 'Type of the payment from account.' })
  payment_from_account_type: BankAccountType;

  @Field({
    nullable: true,
    description: 'BSB number of the payment from account.',
  })
  payment_from_account_bsb_number?: number;

  @Field({
    nullable: true,
    description: 'Account number of the payment from account.',
  })
  payment_from_account_number?: string;
}

@ObjectType({
  description: 'Payment to account details for a selected supplier.',
})
export class FetchPaymentToAccountListOfSelectedSupplier {
  @Field({ nullable: true, description: 'Name of the payment to account.' })
  payment_to_account_name?: string;

  @Field({ description: 'ID of the payment to account.' })
  payment_to_account_id: number;

  @Field({ description: 'Type of the payment to account.' })
  payment_to_account_type: BankAccountType;

  @Field({
    nullable: true,
    description: 'BSB number of the payment to account.',
  })
  payment_to_account_bsb_number?: number;

  @Field({
    nullable: true,
    description: 'Account number of the payment to account.',
  })
  payment_to_account_number?: string;
}

@ObjectType({
  description:
    'Combined payment from account and payment to accounts list for a supplier.',
})
export class FetchPaymentFromAccountDetailsAndPaymentToAccountListOfSelectedSupplier {
  @Field({ description: 'Payment from account details.' })
  payment_from_account_details: FetchPaymentFromAccountDetailsOfContract;

  @Field(() => [FetchPaymentToAccountListOfSelectedSupplier], {
    description: 'List of payment to accounts for the supplier.',
  })
  payment_to_accounts_list: FetchPaymentToAccountListOfSelectedSupplier[];

  @Field({ nullable: true, description: 'Address of the client or supplier.' })
  client_supplier_address?: string;
}

@ObjectType({ description: 'Auto-populatable fields for a retention claim.' })
export class FetchAutoPopulatableFieldsOfARetentionClaim {
  @Field({ description: 'Contract ID associated with the retention claim.' })
  contract_id: number;

  @Field({ description: 'Client or supplier ID.' })
  client_supplier_id: number;

  @Field({ nullable: true, description: 'Name of the client or supplier.' })
  client_supplier_name?: string;

  @Field({ nullable: true, description: 'Address of the client or supplier.' })
  client_supplier_address?: string;

  @Field({ description: 'Project ID.' })
  project_id: number;

  @Field({ nullable: true, description: 'Project name.' })
  project_name?: string;

  @Field({ nullable: true, description: 'Payment terms.' })
  payment_terms?: number;

  @Field({
    nullable: true,
    description: 'Name of the account from which retention is taken.',
  })
  retention_from_account_name?: string;

  @Field({ nullable: true, description: 'ID of the retention from account.' })
  retention_from_account_id?: number;

  @Field({
    nullable: true,
    description: 'BSB number of the retention from account.',
  })
  retention_from_account_bsb_number?: number;

  @Field({
    nullable: true,
    description: 'Account number of the retention from account.',
  })
  retention_from_account_number?: string;

  @Field({ description: 'Type of the retention from account.' })
  retention_from_account_type: BankAccountType;

  @Field({ nullable: true, description: 'Name of the payment to account.' })
  payment_to_account_name?: string;

  @Field({
    nullable: true,
    description: 'Account number of the payment to account.',
  })
  payment_to_account_number?: string;

  @Field({ description: 'Type of the payment to account.' })
  payment_to_account_type: BankAccountType;

  @Field({
    nullable: true,
    description: 'BSB number of the payment to account.',
  })
  payment_to_account_bsb_number?: number;

  @Field({ description: 'ID of the payment to account.' })
  payment_to_account_id: number;
}

@ObjectType({
  description: 'Completion status of associated retention claims.',
})
export class CheckCompletionStatusOfAssociatedRetentionClaims {
  @Field({
    description: 'Indicates whether all previous claims are completed.',
  })
  is_previous_claims_completed: boolean;
}

@ObjectType({
  description:
    'Response indicating the completion status of associated retention claims.',
})
export class CheckCompletionStatusOfAssociatedRetentionClaimsResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({ description: 'Human-readable message about the operation.' })
  message: string;

  @Field({
    description: 'Data object containing completion status of previous claims.',
  })
  data: CheckCompletionStatusOfAssociatedRetentionClaims;
}

@ObjectType({
  description:
    'Response containing payment from account details and a list of payment to accounts for a selected supplier.',
})
export class FetchPaymentFromAccountDetailsAndPaymentToAccountListOfSelectedSupplierResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({ description: 'Human-readable message about the operation.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data object containing account details and payment list.',
  })
  data: FetchPaymentFromAccountDetailsAndPaymentToAccountListOfSelectedSupplier;
}

@ObjectType({
  description: 'Paginated response of all payment claims for a business.',
})
export class FetchAllPaymentClaimsWithTotalCount {
  @Field(() => [FetchAllPaymentClaims], {
    nullable: true,
    description: 'List of payment claims.',
  })
  payment_claims: FetchAllPaymentClaims[];

  @Field({ description: 'Total number of payment claims available.' })
  total_count: number;
}

@ObjectType({ description: 'Representation of a sub-contractor claim.' })
export class FetchSubContractorClaim {
  @Field({ description: 'Unique identifier of the payment claim.' })
  payment_claim_id: number;

  @Field({ description: 'Type of the claim.' })
  claim_type: string;

  @Field({
    nullable: true,
    description: 'Type of cash retention, if applicable.',
  })
  cash_retention_type?: string;

  @Field({ nullable: true, description: 'ID of the client or supplier.' })
  client_supplier_id?: number;

  @Field({ nullable: true, description: 'Name of the client or supplier.' })
  client_supplier_name?: string;

  @Field({ description: 'Project ID associated with the claim.' })
  project_id: number;

  @Field({ nullable: true, description: 'Project name.' })
  project_name?: string;

  @Field({ description: 'Contract ID associated with the claim.' })
  contract_id: number;

  @Field({ nullable: true, description: 'Contract date.' })
  contract_date?: Date;

  @Field({ nullable: true, description: 'Contract name.' })
  contract_name?: string;

  @Field({ nullable: true, description: 'Role of the client or supplier.' })
  client_supplier_role?: string;

  @Field({ nullable: true, description: 'Due date of the claim.' })
  due_date?: Date;

  @Field(() => Float, { nullable: true, description: 'Claim amount.' })
  claim_amount?: number;

  @Field({ nullable: true, description: 'Formatted claim amount.' })
  formatted_claim_amount?: string;

  @Field({ nullable: true, description: 'Status of the claim.' })
  status?: string;

  @Field({
    nullable: true,
    description: 'Status in a list view, if applicable.',
  })
  list_status?: string;

  @Field({ nullable: true, description: 'Date of the claim.' })
  claim_date?: Date;

  @Field({ nullable: true, description: 'Amount already paid for this claim.' })
  amount_paid?: string;

  @Field({
    nullable: true,
    description: 'Unpaid amount remaining for this claim.',
  })
  unpaid_amount?: string;

  @Field({ nullable: true, description: 'Reason why claim is unpaid, if any.' })
  unpaid_reason?: string;
}

@ObjectType({
  description: 'Paginated response of sub-contractor claims with total count.',
})
export class FetchSubContractorClaimsWithTotalCount {
  @Field(() => [FetchSubContractorClaim], {
    description: 'List of sub-contractor claims.',
  })
  payment_claims: FetchSubContractorClaim[];

  @Field({ description: 'Total number of sub-contractor claims.' })
  total_count: number;
}

@ObjectType({
  description: 'Response object for fetching sub-contractor claims.',
})
export class FetchSubContractorClaimsResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({ description: 'Human-readable message about the operation.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Paginated data of sub-contractor claims.',
  })
  data: FetchSubContractorClaimsWithTotalCount;
}

@ObjectType({ description: 'Response for generating S75 notices.' })
export class GenerateS75NoticeResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({ description: 'Human-readable message.' })
  message: string;

  @Field({ nullable: true, description: 'Details of the generated file.' })
  file?: Filedetails;
}

// Similar descriptions can be added for all other response types below
@ObjectType({
  description: 'Response containing all payment claims of a business.',
})
export class FetchAllPaymentClaimsResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({ description: 'Human-readable message.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Paginated list of all payment claims.',
  })
  data: FetchAllPaymentClaimsWithTotalCount;
}

@ObjectType({ description: 'Response after adding a payment claim.' })
export class AddPaymentClaimResponse {
  @Field({ description: 'Status of the operation.' })
  status: 'ERROR' | 'SUCCESS';

  @Field({ description: 'Human-readable message.' })
  message: string;

  @Field({ nullable: true, description: 'Details of the added payment claim.' })
  data: AddPaymentClaim;
}

@ObjectType({
  description: 'Response after fetching details of a payment claim.',
})
export class FetchDetailsOfAPaymentClaimResponse {
  @Field({ description: 'Status of the operation.' })
  status: 'ERROR' | 'SUCCESS';

  @Field({ description: 'Human-readable message.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Details of the fetched payment claim.',
  })
  data: FetchDetailsOfAPaymentClaim;
}

@ObjectType({
  description: 'Response after changing the status of a payment claim.',
})
export class ChangeStatusOfAPaymentClaimResponse {
  @Field({ description: 'Status of the operation.' })
  status: 'ERROR' | 'SUCCESS';

  @Field({ description: 'Human-readable message.' })
  message: string;

  @Field({ nullable: true, description: 'Previous or updated status string.' })
  data: string;
}

@ObjectType({
  description: 'Response after editing details of a payment claim.',
})
export class EditDetailsOfAPaymentClaimResponse {
  @Field({ description: 'Status of the operation.' })
  status: 'ERROR' | 'SUCCESS';

  @Field({ description: 'Human-readable message.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Details of the edited payment claim.',
  })
  data: EditPaymentClaim;
}

@ObjectType({
  description:
    'Response containing auto-populatable fields of a retention claim.',
})
export class FetchAutoPopulatableFieldsOfARetentionClaimResponse {
  @Field({ description: 'Status of the operation.' })
  status: 'ERROR' | 'SUCCESS';

  @Field({ description: 'Human-readable message.' })
  message: string;

  @Field({ nullable: true, description: 'Auto-populatable fields data.' })
  data: FetchAutoPopulatableFieldsOfARetentionClaim;
}
@ObjectType({
  description:
    'Contains the action buttons configuration for a payment claim or payment.',
})
export class GetListActionButtonsRes {
  @Field({ nullable: true, description: 'Type of the claim.' })
  claim_type: string;

  @Field({
    nullable: true,
    description: 'Type of payment associated with the claim.',
  })
  payment_type: string;

  @Field({ nullable: true, description: 'Current status of the claim.' })
  current_status: string;

  @Field({
    nullable: true,
    description: 'Status displayed in the user interface.',
  })
  status_in_ui: string;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Buttons available in the claim list view.',
  })
  claim_list_buttons: Record<string, any>;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Buttons available in the payment list view.',
  })
  payment_list_buttons: Record<string, any>;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Buttons available in the claim overview view.',
  })
  claim_overview_buttons: Record<string, any>;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Buttons available in the payment overview view.',
  })
  payment_overview_buttons: Record<string, any>;
}

@ObjectType({
  description:
    'Response for retrieving action buttons for a payment claim or payment.',
})
export class GetListActionButtonsResponse {
  @Field({ description: 'Status of the API response.' })
  status: string;

  @Field({ description: 'Human-readable message about the response.' })
  message: string;

  @Field({ nullable: true, description: 'Action buttons data object.' })
  data?: GetListActionButtonsRes;
}

@ObjectType({
  description: 'Details of an individual invoice for a payment claim.',
})
export class FetchInvoiceDetailsResponse {
  @Field({ description: 'Description of the invoice item.' })
  description: string;

  @Field(() => Float, { description: 'Quantity of the item.' })
  quantity: number;

  @Field(() => Float, { description: 'Unit price of the item.' })
  unit_price: number;

  @Field(() => Float, {
    description: 'GST amount (auto-calculated at 10% of total).',
  })
  gst: number;

  @Field(() => Float, { description: 'Total amount including GST.' })
  total_amount_including_gst: number;
}

@ObjectType({ description: 'Details of an import payment claim.' })
export class FetchDetailsOfImportPaymentClaim {
  @Field({ description: 'Business ID associated with the claim.' })
  company_id: number;

  @Field({ description: 'Type of the payment claim.' })
  claim_type: PaymentClaimTypes;

  @Field({ description: 'Cash retention type, if applicable.' })
  cash_retention_type: CashRetentionType;

  @Field({
    nullable: true,
    description: 'Project ID associated with the claim, if any.',
  })
  project_id: number;

  @Field({
    nullable: true,
    description: 'Contract ID associated with the claim, if any.',
  })
  contract_id: number;

  @Field({
    nullable: true,
    description: 'Client/Supplier ID associated with the claim, if any.',
  })
  client_supplier_id: number;

  @Field(() => Float, { nullable: true, description: 'Total claim amount.' })
  claim_amount: number;

  @Field({
    nullable: true,
    description: 'Indicates if GST is optional for this claim.',
  })
  is_gst_optional: boolean;

  @Field({
    nullable: true,
    description: 'Subtotal of the claim (excluding GST).',
  })
  sub_total_summary: number;

  @Field({ nullable: true, description: 'Total GST amount for the claim.' })
  gst_summary: number;

  @Field(() => [FetchInvoiceDetailsResponse], {
    nullable: true,
    description: 'List of invoices associated with the claim.',
  })
  invoice_list: FetchInvoiceDetailsResponse[];

  @Field({
    nullable: true,
    description: 'Indicates if this claim includes cash retention.',
  })
  cash_retention: Boolean;

  @Field({ nullable: true, description: 'Retention amount for this claim.' })
  retention_amount: number;

  @Field({
    nullable: true,
    description: 'Retention percentage for this claim.',
  })
  retention_percentage: number;

  @Field({ nullable: true, description: 'Retention amount including GST.' })
  retention_amount_with_gst: number;

  @Field({
    nullable: true,
    description: 'Formatted string of retention amount.',
  })
  formatted_retention_amount: string;

  @Field({ nullable: true, description: 'Formatted string of claim amount.' })
  formatted_claim_amount: string;

  @Field({
    nullable: true,
    description: 'Formatted string of retention amount including GST.',
  })
  formatted_retention_amount_with_gst: string;
}

@ObjectType({
  description: 'Response for fetching details of an import payment claim.',
})
export class FetchDetailsOfImportPaymentClaimResponse {
  @Field({ description: 'Status of the API response.' })
  status: 'ERROR' | 'SUCCESS';

  @Field({ description: 'Human-readable message about the response.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data object containing details of the import payment claim.',
  })
  data?: FetchDetailsOfImportPaymentClaim;
}
