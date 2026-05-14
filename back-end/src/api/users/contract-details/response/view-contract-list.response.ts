import { ObjectType, Field, Float } from '@nestjs/graphql';
import {
  ClientSupplierType,
  RelatedEntity,
} from 'src/entities/client-suppliers-details.entity';
import {
  ClientSupplierRole,
  ContractStatus,
  RetentionType,
} from 'src/entities/contract-details.entity';
import {
  ProjectRole,
  ProjectStatus,
} from 'src/entities/project-details.entity';
import { BankAccountType } from 'src/libs/@paytrade-types/paytrade-types';
import { TriggerNoticesData } from '../../notices/notices.response';

@ObjectType({ description: 'Detailed view of a single contract.' })
export class ViewContractRes {
  @Field({
    nullable: true,
    description: 'Unique identifier of the contract record.',
  })
  id?: string;

  @Field({ nullable: true, description: 'Identifier of the contract.' })
  contract_id?: number;

  @Field({
    nullable: true,
    description: 'Identifier of the associated business.',
  })
  company_id?: number;

  @Field({
    nullable: true,
    description: 'Name of the business associated with the contract.',
  })
  company_name?: string;

  @Field({ nullable: true, description: 'Name of the contract.' })
  contract_name?: string;

  @Field({
    nullable: true,
    description:
      'Role of client or supplier in the contract (e.g., Principal, Head Contractor, Related Entity Sub Contractor, Sub Contractor).',
  })
  client_supplier_role?: ClientSupplierRole;

  @Field({ nullable: true, description: 'Type of contract.' })
  contract_type?: string;

  @Field({
    nullable: true,
    description:
      "Billing type of the contract: 'Fixed' or 'Hourly'.",
  })
  contract_billing_type?: string;

  @Field({
    nullable: true,
    description:
      'Current status of the contract (e.g., Draft, In Progress, Completed, Archived, Deleted).',
  })
  contract_status?: ContractStatus;

  @Field({
    nullable: true,
    description:
      'Previous status of the contract before updates (e.g., Draft, In Progress, Completed, Archived, Deleted).',
  })
  previous_status?: ContractStatus;

  @Field({ nullable: true, description: 'Date when the contract was signed.' })
  contract_date?: Date;

  @Field({ nullable: true, description: 'Associated project ID.' })
  project_id?: number;

  @Field({ nullable: true, description: 'Associated project name.' })
  project_name?: string;

  @Field({
    nullable: true,
    description:
      'Role of the project for this contract (e.g., Principal, Head Contractor, Sub Contractor).',
  })
  project_role?: ProjectRole;

  @Field({
    nullable: true,
    description: 'Related entity for the contract (e.g., Yes, No).',
  })
  related_entity?: RelatedEntity;

  @Field({
    nullable: true,
    description: 'Site address associated with the project.',
  })
  site_address?: string;

  @Field({ nullable: true, description: 'Client or supplier ID.' })
  client_supplier_id?: number;

  @Field({ nullable: true, description: 'Name of the client or supplier.' })
  client_supplier_name?: string;

  @Field({
    nullable: true,
    description: 'Type of client or supplier (e.g., Client, Supplier).',
  })
  client_supplier_type?: ClientSupplierType;

  @Field({ nullable: true, description: 'Address of client or supplier.' })
  client_supplier_address?: string;

  @Field({
    nullable: true,
    description:
      'Type of retention in the contract (e.g., Cash, Bank guaranteed, None).',
  })
  retention_type?: RetentionType;

  @Field({ nullable: true, description: 'Payment terms in the contract.' })
  payment_terms?: number;

  @Field(() => Float, { nullable: true, description: 'Initial contract sum.' })
  initial_contract_sum?: number;

  @Field({
    nullable: true,
    description: 'Formatted initial contract sum as string with currency.',
  })
  formatted_initial_contract_sum?: string;

  @Field(() => Float, {
    nullable: true,
    description: 'Variation amount applied to the contract.',
  })
  variation_amount?: number;

  @Field({
    nullable: true,
    description: 'Attachment ID associated with the contract.',
  })
  attachment_id?: string;

  @Field({ nullable: true, description: 'Contract start date.' })
  contract_start_date?: Date;

  @Field({ nullable: true, description: 'Defect liability end date.' })
  defect_liability_end_date?: Date;

  @Field({ nullable: true, description: 'Buyer name for the contract.' })
  buyer_name?: string;

  @Field({ nullable: true, description: 'Seller name for the contract.' })
  seller_name?: string;

  @Field({
    nullable: true,
    description: 'Bank account ID for payments from the buyer.',
  })
  payment_from_account?: number;

  @Field({
    nullable: true,
    description: 'Bank account ID for retention from buyer.',
  })
  retention_from_account?: number;

  @Field({
    nullable: true,
    description: 'Bank account ID for payments to the seller.',
  })
  payment_to_account?: number;

  @Field({
    nullable: true,
    description: 'Name of the bank account payments are from.',
  })
  payment_from_account_name?: string;

  @Field({
    nullable: true,
    description: 'Name of the bank account retention is from.',
  })
  retention_from_account_name?: string;

  @Field({
    nullable: true,
    description: 'Name of the bank account payments are to.',
  })
  payment_to_account_name?: string;

  @Field({
    nullable: true,
    description:
      'Type of payment bank account (e.g., Retention Trust Account, Project Trust Account, General Account).',
  })
  payment_from_account_type?: BankAccountType;

  @Field({
    nullable: true,
    description:
      'Type of retention bank account (e.g., Retention Trust Account, Project Trust Account, General Account).',
  })
  retention_from_account_type?: BankAccountType;

  @Field({
    nullable: true,
    description:
      'Type of payment-to bank account (e.g., Retention Trust Account, Project Trust Account, General Account).',
  })
  payment_to_account_type?: BankAccountType;

  @Field({
    nullable: true,
    description: 'Original uploaded file name of the contract.',
  })
  file_name?: string;

  @Field({ nullable: true, description: 'File type of the contract.' })
  file_type?: string;

  @Field({ nullable: true, description: 'Path to the contract file.' })
  file_path?: string;

  @Field({
    nullable: true,
    description: 'Base64 or encoded contract file content.',
  })
  file?: string;

  @Field({
    nullable: true,
    description: 'Indicates if a notice has been generated for this contract.',
  })
  notice_generated?: boolean;

  @Field({
    nullable: true,
    description:
      'Indicates if there are active payment claims linked to this contract.',
  })
  active_payment_claims?: boolean;

  @Field(() => TriggerNoticesData, {
    nullable: true,
    description: 'Associated notices for the contract.',
  })
  notices?: TriggerNoticesData;
}

@ObjectType({ description: 'Represents a contract in the contract list.' })
export class GetContractListResp {
  @Field({
    nullable: true,
    description: 'Unique identifier of the contract record.',
  })
  id?: string;

  @Field({ nullable: true, description: 'Contract ID.' })
  contract_id?: number;

  @Field({
    nullable: true,
    description: 'business ID associated with the contract.',
  })
  company_id?: number;

  @Field({
    nullable: true,
    description: 'business name associated with the contract.',
  })
  company_name?: string;

  @Field({ nullable: true, description: 'Name of the contract.' })
  contract_name?: string;

  @Field({ nullable: true, description: 'Type of contract.' })
  contract_type?: string;

  @Field({
    nullable: true,
    description:
      "Billing type of the contract: 'Fixed' or 'Hourly'.",
  })
  contract_billing_type?: string;

  @Field({
    nullable: true,
    description:
      'Previous status of the contract (e.g., Draft, In Progress, Completed, Archived, Deleted).',
  })
  previous_status?: ContractStatus;

  @Field({ nullable: true, description: 'Role of the client or supplier.' })
  client_supplier_role?: string;

  @Field({ nullable: true, description: 'Date the contract was signed.' })
  contract_date?: Date;

  @Field({ nullable: true, description: 'Current status of the contract.' })
  contract_status?: string;

  @Field({ nullable: true, description: 'Project ID related to the contract.' })
  project_id?: number;

  @Field({
    nullable: true,
    description: 'Project name related to the contract.',
  })
  project_name?: string;

  @Field({
    nullable: true,
    description:
      'Current status of the project (e.g., Draft, In Progress, Completed, Archived, Deleted).',
  })
  project_status?: ProjectStatus;

  @Field({
    nullable: true,
    description: 'Client or supplier ID associated with the contract.',
  })
  client_supplier_id?: number;

  @Field({
    nullable: true,
    description: 'Client or supplier name associated with the contract.',
  })
  client_supplier_name?: string;

  @Field({ nullable: true, description: 'Client or supplier type.' })
  client_supplier_type?: string;

  @Field({ nullable: true, description: 'Type of retention in the contract.' })
  retention_type?: string;

  @Field({
    nullable: true,
    description: 'Payment terms specified in the contract.',
  })
  payment_terms?: number;

  @Field({ nullable: true, description: 'Initial contract sum.' })
  initial_contract_sum?: number;

  @Field({
    nullable: true,
    description: 'Formatted initial contract sum as string.',
  })
  formatted_initial_contract_sum?: string;

  @Field({
    nullable: true,
    description: 'Attachment ID for the contract document.',
  })
  attachment_id?: string;

  @Field({ nullable: true, description: 'Contract start date.' })
  contract_start_date?: Date;

  @Field({ nullable: true, description: 'Defect liability end date.' })
  defect_liability_end_date?: Date;

  @Field({ nullable: true, description: 'Buyer name in the contract.' })
  buyer_name?: string;

  @Field({ nullable: true, description: 'Seller name in the contract.' })
  seller_name?: string;

  @Field({
    nullable: true,
    description: 'Variation amount applied to the contract.',
  })
  variation_amount?: number;

  @Field({ nullable: true, description: 'Formatted variation amount.' })
  formatted_variation_amount?: string;

  @Field({
    nullable: true,
    description: 'Bank account ID from which payment is made.',
  })
  payment_from_account?: number;

  @Field({
    nullable: true,
    description: 'Bank account ID from which retention is taken.',
  })
  retention_from_account?: number;

  @Field({
    nullable: true,
    description: 'Bank account ID to which payment is made.',
  })
  payment_to_account?: number;
}

@ObjectType({ description: 'Project information used in contract listing.' })
export class ProjectResponse {
  @Field({ nullable: true, description: 'Project ID.' })
  project_id?: number;

  @Field({ nullable: true, description: 'Project name.' })
  project_name?: string;
}

@ObjectType({
  description:
    'Response for viewing a list of contracts along with project info.',
})
export class ViewContractListRes {
  @Field(() => [GetContractListResp], {
    nullable: true,
    description: 'List of contracts.',
  })
  contract_list?: GetContractListResp[];

  @Field({ description: 'Total number of contracts.' })
  total_count: number;

  @Field(() => [ProjectResponse], {
    nullable: true,
    description: 'List of projects.',
  })
  project_list?: ProjectResponse[];
}

@ObjectType({ description: 'API response for viewing contract list.' })
export class ViewContractListResponse {
  @Field({ description: 'API response status.' })
  status: string;

  @Field({ description: 'Message describing the response.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing contracts and project list.',
  })
  data?: ViewContractListRes;
}

@ObjectType({ description: 'API response for viewing a single contract.' })
export class ViewContractResponse {
  @Field({ description: 'API response status.' })
  status: string;

  @Field({ description: 'Message describing the response.' })
  message: string;

  @Field({ nullable: true, description: 'Detailed contract information.' })
  data?: ViewContractRes;
}
