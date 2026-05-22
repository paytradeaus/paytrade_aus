import { InputType, Field, Float } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import { ClientSupplierRole } from 'src/entities/contract-details.entity';
import {
  BankAccountStatus,
  BankAccountType,
  ClosingMode,
  DelegatePowers,
} from 'src/libs/@paytrade-types/paytrade-types';

@InputType({
  description:
    'Input to add a new bank account for a business or client/supplier.',
})
export class AddBankAccountInput {
  @Field({ description: 'Name of the bank account.' })
  account_name: string;

  @Field({
    description:
      'Type of the bank account (e.g., Project Trust, Retention Trust).',
  })
  account_type: BankAccountType;

  @Field({ description: 'Bank account number.' })
  account_number: string;

  @Field({ description: 'Business ID the account belongs to.' })
  company_id: number;

  @Field({ description: 'BSB number of the bank account.' })
  bsb_number: number;

  @Field(() => [Number], {
    nullable: true,
    description: 'IDs of projects associated with this bank account.',
  })
  project_ids: number[];

  @Field({
    nullable: true,
    description: 'APCA number of the bank account, if applicable.',
  })
  apca_number?: number;

  @Field({
    nullable: true,
    description: 'Trustee ID if this account has a trustee.',
  })
  trustee_id: number;

  @Field({
    nullable: true,
    description: 'Associated general account ID, if applicable.',
  })
  associated_cash_account_id: number;

  @Field({ nullable: true, description: 'Current status of the bank account.' })
  status: BankAccountStatus;

  @Field({
    nullable: true,
    description:
      'Client/Supplier ID if the account belongs to a client/supplier.',
  })
  client_supplier_id?: number;

  @Field({ nullable: true, description: 'Date the account was opened.' })
  opening_date: Date;

  @Field({ nullable: true, description: 'Date of the related contract.' })
  contract_date: Date;

  @Field({
    nullable: true,
    description: 'Practical completion date of the contract.',
  })
  contract_practical_completion_date: Date;

  @Field({
    nullable: true,
    description: 'Date of first subcontract, if applicable.',
  })
  first_sub_contract_date: Date;

  @Field(() => Float, {
    nullable: true,
    description: 'Value of the contract associated with this account.',
  })
  contract_value: number;

  @Field(() => [String], {
    nullable: true,
    description: 'List of retention trust certificate attachment IDs.',
  })
  retention_trust_certificate_attachment_ids?: string[];

  @Field({ description: 'Name of the financial institution.' })
  financial_institution: string;

  @Field({
    nullable: true,
    description: 'Delegate powers assigned to this account.',
  })
  delegate_powers: DelegatePowers;

  @Field({
    nullable: true,
    description: 'User ID of the logged-in user creating the record.',
  })
  created_by: number;

  @Field({
    nullable: true,
    description:
      'If true, any QBCC / client notices generated when the account moves to Open are immediately marked as Sent (the user has already lodged them outside the system) and no email is dispatched.',
  })
  mark_notices_as_sent?: boolean;
}

@InputType({
  description: 'Input to check existence of a bank account number.',
})
export class CheckExistenceOfBankAccountNumberInput {
  @Field({ description: 'Bank account number to check for existence.' })
  bank_account_number: string;
}

@InputType({
  description: 'Input to edit details of an existing bank account.',
})
export class EditDetailsOfABankAccountInput {
  @Field({ description: 'ID of the bank account to edit.' })
  bank_account_id: number;

  @Field({ description: 'business ID associated with the account.' })
  company_id: number;

  @Field({ nullable: true, description: 'Updated account name.' })
  account_name?: string;

  @Field({ nullable: true, description: 'Updated bank account number.' })
  account_number?: string;

  @Field({ nullable: true, description: 'Updated BSB number.' })
  bsb_number?: number;

  @Field({ nullable: true, description: 'Updated APCA number.' })
  apca_number?: number;

  @Field({ nullable: true, description: 'Updated account type.' })
  account_type?: BankAccountType;

  @Field(() => [Number], {
    nullable: true,
    description: 'Updated list of project IDs associated with this account.',
  })
  project_ids?: number[];

  @Field({ nullable: true, description: 'Updated trustee ID, if applicable.' })
  trustee_id?: number;

  @Field({
    nullable: true,
    description: 'Updated client/supplier ID, if applicable.',
  })
  client_supplier_id?: number;

  @Field({ nullable: true, description: 'Updated contract date.' })
  contract_date: Date;

  @Field({ nullable: true, description: 'Updated account opening date.' })
  opening_date: Date;

  @Field({
    nullable: true,
    description: 'Updated practical completion date of the contract.',
  })
  contract_practical_completion_date: Date;

  @Field({ nullable: true, description: 'Updated first subcontract date.' })
  first_sub_contract_date: Date;

  @Field(() => Float, {
    nullable: true,
    description: 'Updated contract value.',
  })
  contract_value: number;

  @Field(() => [String], {
    nullable: true,
    description: 'Updated retention trust certificate attachment IDs.',
  })
  retention_trust_certificate_attachment_ids?: string[];

  @Field({ nullable: true, description: 'Updated financial institution name.' })
  financial_institution?: string;

  @Field({ nullable: true, description: 'Updated delegate powers.' })
  delegate_powers?: DelegatePowers;

  @Field({
    nullable: true,
    description: 'User ID of the person updating the record.',
  })
  updated_by?: number;

  @Field({ nullable: true, description: 'Updated status of the bank account.' })
  status: BankAccountStatus;

  @Field({ nullable: true, description: 'Updated associated general account ID.' })
  associated_cash_account_id: number;

  @Field({
    nullable: true,
    description:
      'If true, any QBCC / client notices generated when the account moves to Open are immediately marked as Sent (the user has already lodged them outside the system) and no email is dispatched.',
  })
  mark_notices_as_sent?: boolean;
}

@InputType({
  description:
    'Input to fetch all bank accounts with optional filters and pagination.',
})
export class FetchAllBankAccountsInput {
  @Field({ description: 'business ID to fetch accounts for.' })
  company_id: number;

  @Field({ nullable: true, description: 'Filter by bank account status.' })
  status?: BankAccountStatus;

  @Field({ nullable: true, description: 'Filter by bank account type.' })
  account_type?: string;

  @Field({ nullable: true, description: 'Page number for pagination.' })
  page?: number;

  @Field({
    nullable: true,
    description: 'Search term to filter accounts by name or number.',
  })
  search?: string;

  @Field({ nullable: true, description: 'Number of items per page.' })
  items_per_page?: number;

  @Field({
    nullable: true,
    description: 'Filter accounts associated with a specific project.',
  })
  project_id?: number;

  @Field({
    nullable: true,
    description: 'Whether to sort accounts in alphabetical order.',
  })
  is_alphabetical_order?: boolean;

  @Field({ nullable: true, description: 'Field to sort by.' })
  sorting_field?: string;

  @Field({ nullable: true, description: 'Sorting order: ASC or DESC.' })
  sorting_order?: 'ASC' | 'DESC';

  @Field({ nullable: true, description: 'Filter by delegate powers.' })
  delegate_powers?: DelegatePowers;
}

@InputType({ description: 'Input to change the status of a bank account.' })
export class ChangeStatusOfBankAccountInput {
  @Field({ description: 'Bank account ID to update.' })
  bank_account_id?: number;

  @Field({ description: 'New status for the bank account.' })
  status?: BankAccountStatus;
}

// Task #238 — explicit user action: close or transfer a Project/Retention
// Trust account. Persists closing context on the bank_accounts row and
// fires the QBCC TA2 + per-beneficiary Contracting Party Account Closing
// Notice set. The 'Renamed' mode is reserved for the internal
// rename-auto-trigger path inside `editDetailsOfABankAccount` and is NOT
// accepted via this mutation.
@InputType({
  description:
    'Input to close, transfer, or rename a Project/Retention Trust account ' +
    'and auto-fire the TA2 + Contracting Party Account Closing notice set.',
})
export class CloseOrChangeBankAccountInput {
  @Field({ description: 'Bank account ID to close or transfer.' })
  bank_account_id: number;

  @Field({
    description:
      "Closing mode — 'Closed' or 'Transferred'. 'Renamed' is reserved for internal use.",
  })
  closing_mode: ClosingMode;

  @Field({ description: 'Effective date of the close/transfer.' })
  closing_effective_date: Date;

  @Field({
    nullable: true,
    description:
      'New account name for the replacement/transfer-target account (Transferred only).',
  })
  closing_target_account_name?: string;

  @Field({
    nullable: true,
    description:
      'Financial institution of the replacement account (Transferred only).',
  })
  closing_target_financial_institution?: string;

  @Field({
    nullable: true,
    description: 'BSB of the replacement account (Transferred only).',
  })
  closing_target_bsb?: number;

  @Field({
    nullable: true,
    description:
      'Account number of the replacement account (Transferred only).',
  })
  closing_target_account_number?: string;

  @Field({
    nullable: true,
    description:
      'Opening date of the replacement account (Transferred only).',
  })
  closing_target_opening_date?: Date;

  @Field({
    nullable: true,
    description:
      'If true, generated TA2 / Contracting-Party closing notices are immediately marked Sent (user lodged externally) and no email is dispatched.',
  })
  mark_notices_as_sent?: boolean;
}

@InputType({
  description: 'Input to fetch details of a specific bank account.',
})
export class FetchBankAccountDetailsInput {
  @Field({ description: 'business ID the account belongs to.' })
  company_id: number;

  @Field({ description: 'Bank account ID to fetch details for.' })
  bank_account_id: number;
}

@InputType({
  description:
    'Input to get a list of bank accounts filtered by type, project, client, or retention type.',
})
export class GetBankAccountListInput {
  @Field({ description: 'business ID.' })
  company_id: number;

  @Field({
    description: 'Type of bank account (e.g., Project Trust, Retention Trust).',
  })
  type: string;

  @Field({ description: 'Project ID associated with the account.' })
  project_id: number;

  @Field({ description: 'Client/Supplier ID associated with the account.' })
  client_supplier_id: number;

  @Field({ description: 'Retention type of the bank account.' })
  retention_type: string;

  @Field({ description: 'Role of the client/supplier for the contract.' })
  client_supplier_role: ClientSupplierRole;
}

@InputType({
  description: 'Input to update delegate powers for multiple bank accounts.',
})
export class UpdateDelegatePowersInput {
  @Field(() => [Number], { description: 'List of bank account IDs to update.' })
  account_ids: number[];

  @Field({ description: 'Business ID for which delegate powers are updated.' })
  company_id: number;
}
