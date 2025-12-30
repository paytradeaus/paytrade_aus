import { ObjectType, Field, Int, Float } from '@nestjs/graphql';
import {
  BankAccountStatus,
  BankAccountType,
  DelegatePowers,
  LastUpdateType,
} from 'src/libs/@paytrade-types/paytrade-types';
import { TriggerNoticesData } from '../../notices/notices.response';

@ObjectType({
  description:
    'Represents a bank account item returned in the bank accounts list view.',
})
export class FetchAllBankAccounts {
  @Field({
    nullable: true,
    description: 'Unique identifier of the bank account.',
  })
  bank_account_id: number;

  @Field({ nullable: true, description: 'Name of the bank account.' })
  account_name: string;

  @Field({ nullable: true, description: 'Type of the bank account.' })
  account_type: string;

  @Field({
    nullable: true,
    description: 'BSB number associated with the bank account.',
  })
  bsb_number: number;

  @Field({ nullable: true, description: 'APCA number of the bank account.' })
  apca_number: number;

  @Field({ nullable: true, description: 'Bank account number.' })
  account_number: string;

  @Field({
    nullable: true,
    description: 'Date when the bank account was opened.',
  })
  opening_date: Date;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the bank account was created.',
  })
  created_on: Date;

  @Field(() => Float, {
    nullable: true,
    description: 'Current balance of the bank account.',
  })
  current_balance: number;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the bank account was last updated.',
  })
  updated_on: Date;

  @Field({
    nullable: true,
    description: 'Number of days since the account was last updated.',
  })
  last_updated_days: number;

  @Field({
    nullable: true,
    description: 'Type of the last update performed on the account.',
  })
  last_updated_type: LastUpdateType;

  @Field({ nullable: true, description: 'Current status of the bank account.' })
  status: BankAccountStatus;

  @Field({
    nullable: true,
    description: 'Previous status of the bank account.',
  })
  previous_status: BankAccountStatus;

  @Field({
    nullable: true,
    description: 'Number of projects linked to the bank account.',
  })
  projects_count: number;

  @Field({
    nullable: true,
    description: 'Number of unmatched transactions for the bank account.',
  })
  unmatched_transactions_count: number;

  @Field({
    nullable: true,
    description: 'Remaining days before required compliance or action.',
  })
  remaining_days: number;

  @Field({
    nullable: true,
    description: 'Formatted string value of the bank account balance.',
  })
  formatted_bank_account_balance: string;

  @Field({
    nullable: true,
    description:
      'Indicates whether this account is associated with a cash account.',
  })
  is_cash_associated?: boolean;
}

@ObjectType({
  description: 'Result returned after successfully creating a bank account.',
})
export class AddBankAccount {
  @Field({
    description: 'Unique identifier of the newly created bank account.',
  })
  bank_account_id: number;

  @Field(() => TriggerNoticesData, {
    nullable: true,
    description: 'Triggered notices associated with the bank account creation.',
  })
  notices?: TriggerNoticesData;
}

@ObjectType({
  description: 'Result returned after editing an existing bank account.',
})
export class EditBankAccount {
  @Field(() => TriggerNoticesData, {
    nullable: true,
    description: 'Triggered notices associated with the bank account update.',
  })
  notices?: TriggerNoticesData;
}

@ObjectType({
  description: 'Represents head contract details created for TA1.',
})
export class AddHeadContractDetailsForTA1 {
  @Field({ description: 'Unique identifier of the head contract.' })
  id: string;
}

@ObjectType({
  description:
    'Indicates whether a bank account number already exists in the system.',
})
export class CheckExistenceOfBankAccountNumber {
  @Field({ description: 'True if the bank account number already exists.' })
  is_present: boolean;
}

@ObjectType({ description: 'Detailed view of a bank account.' })
export class FetchBankAccountDetails {
  @Field({
    nullable: true,
    description: 'Unique identifier of the bank account.',
  })
  bank_account_id: number;

  @Field({ nullable: true, description: 'Name of the bank account.' })
  account_name: string;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the bank account was created.',
  })
  created_on: Date;

  @Field({ nullable: true, description: 'Type of the bank account.' })
  account_type: string;

  @Field({ nullable: true, description: 'Name of the financial institution.' })
  financial_institution: string;

  @Field({
    nullable: true,
    description: 'Date when the bank account was opened.',
  })
  opening_date: Date;

  @Field({ nullable: true, description: 'Current status of the bank account.' })
  status: string;

  @Field(() => Float, {
    nullable: true,
    description: 'Current balance of the bank account.',
  })
  current_balance: number;

  @Field(() => Float, {
    nullable: true,
    description: 'Total interest charges accumulated on the account.',
  })
  interest_charges_sum: number;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the bank account was last updated.',
  })
  updated_on: Date;

  @Field({ nullable: true, description: 'Bank account number.' })
  account_number: string;

  @Field({
    nullable: true,
    description: 'BSB number associated with the bank account.',
  })
  bsb_number: number;

  @Field({ nullable: true, description: 'APCA number of the bank account.' })
  apca_number: number;

  @Field({
    nullable: true,
    description: 'Type of the last update made to the account.',
  })
  last_updated_type: LastUpdateType;

  @Field({
    nullable: true,
    description: 'Previous status of the bank account.',
  })
  previous_status: BankAccountStatus;

  @Field({
    nullable: true,
    description: 'ID of the associated cash account, if applicable.',
  })
  associated_cash_account_id: number;
}

@ObjectType({ description: 'Bank account details used for editing purposes.' })
export class FetchBankAccountDetailsForEditing {
  @Field({ description: 'Unique identifier of the bank account.' })
  bank_account_id: number;

  @Field({ nullable: true, description: 'Type of the bank account.' })
  account_type: BankAccountType;

  @Field({ description: 'Name of the bank account.' })
  account_name: string;

  @Field({ nullable: true, description: 'Name of the financial institution.' })
  financial_institution: string;

  @Field({
    nullable: true,
    description: 'Trustee ID associated with the account.',
  })
  trustee_id: number;

  @Field({
    nullable: true,
    description: 'Client or supplier ID linked to the account.',
  })
  client_supplier_id?: number;

  @Field(() => [Int], {
    nullable: true,
    description: 'Project IDs associated with the bank account.',
  })
  project_ids: number[];

  @Field({
    nullable: true,
    description: 'Contract date associated with the account.',
  })
  contract_date: Date;

  @Field({ nullable: true, description: 'Account opening date.' })
  opening_date: Date;

  @Field({
    nullable: true,
    description: 'Contract practical completion date.',
  })
  contract_practical_completion_date: Date;

  @Field({ nullable: true, description: 'Date of the first subcontract.' })
  first_sub_contract_date: Date;

  @Field(() => Float, {
    nullable: true,
    description: 'Contract value associated with the account.',
  })
  contract_value: number;

  @Field({
    nullable: true,
    description: 'Delegate powers configuration for the account.',
  })
  delegate_powers?: DelegatePowers;

  @Field(() => [String], {
    nullable: true,
    description: 'Retention trust certificate attachment IDs.',
  })
  retention_trust_certificate_attachment_ids?: string[];

  @Field({ nullable: true, description: 'Bank account number.' })
  account_number: string;

  @Field({ nullable: true, description: 'BSB number of the bank account.' })
  bsb_number: number;

  @Field({ nullable: true, description: 'APCA number of the bank account.' })
  apca_number: number;

  @Field({ description: 'Current status of the bank account.' })
  status: BankAccountStatus;

  @Field({
    nullable: true,
    description: 'Previous status of the bank account.',
  })
  previous_status: BankAccountStatus;

  @Field({
    nullable: true,
    description: 'Associated cash account ID, if applicable.',
  })
  associated_cash_account_id: number;
}

@ObjectType({
  description:
    'Response returned after successfully adding a new bank account.',
})
export class AddBankAccountResponse {
  @Field({ description: 'Status of the operation.' })
  status: string;

  @Field({ description: 'Human-readable message describing the result.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Details of the newly created bank account.',
  })
  data: AddBankAccount;
}

@ObjectType({
  description: 'Response returned after editing an existing bank account.',
})
export class EditDetailsOfABankAccountResponse {
  @Field({ description: 'Status of the operation.' })
  status: string;

  @Field({ description: 'Human-readable message describing the result.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Details related to the edited bank account.',
  })
  data: EditBankAccount;
}

@ObjectType({
  description: 'Response returned after adding head contract details for TA1.',
})
export class AddHeadContractDetailsForTA1Response {
  @Field({ description: 'Status of the operation.' })
  status: string;

  @Field({ description: 'Human-readable message describing the result.' })
  message: string;

  @Field({
    description: 'Details of the created head contract for TA1.',
  })
  data: AddHeadContractDetailsForTA1;
}

@ObjectType({
  description: 'Response returned after editing head contract details for TA1.',
})
export class EditHeadContractDetailsForTA1Response {
  @Field({ description: 'Status of the operation.' })
  status: string;

  @Field({ description: 'Human-readable message describing the result.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Result or identifier related to the edited head contract.',
  })
  data: string;
}

@ObjectType({
  description: 'Response containing bank account details prepared for editing.',
})
export class FetchBankAccountDetailsForEditingResponse {
  @Field({ description: 'Status of the operation.' })
  status: string;

  @Field({ description: 'Human-readable message describing the result.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Editable bank account details.',
  })
  data: FetchBankAccountDetailsForEditing;
}

@ObjectType({ description: 'Head contract details used for TA1 processing.' })
export class FetchHeadContractDetailsForTA1 {
  @Field({ description: 'Unique identifier of the head contract.' })
  head_contract_id: string;

  @Field({ description: 'Date when the head contract was signed.' })
  contract_date: Date;

  @Field({
    description: 'Date of practical completion of the head contract.',
  })
  contract_practical_completion_date: Date;

  @Field({
    description: 'Date when the first subcontract was executed.',
  })
  first_sub_contract_date: Date;

  @Field(() => Float, {
    nullable: true,
    description: 'Total value of the head contract.',
  })
  contract_value: number;
}

@ObjectType({
  description: 'Response containing head contract details for TA1.',
})
export class FetchHeadContractDetailsForTA1Response {
  @Field({ description: 'Status of the operation.' })
  status: string;

  @Field({ description: 'Human-readable message describing the result.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Fetched head contract details.',
  })
  data?: FetchHeadContractDetailsForTA1;
}

@ObjectType({
  description: 'Response indicating whether a bank account number exists.',
})
export class CheckExistenceOfBankAccountNumberResponse {
  @Field({ description: 'Status of the operation.' })
  status: string;

  @Field({ description: 'Human-readable message describing the result.' })
  message: string;

  @Field({
    description: 'Existence information of the bank account number.',
  })
  data: CheckExistenceOfBankAccountNumber;
}

@ObjectType({
  description: 'List of bank accounts along with total count information.',
})
export class FetchAllBankAccountsWithTotalCount {
  @Field(() => [FetchAllBankAccounts], {
    nullable: true,
    description: 'List of bank accounts matching the applied filters.',
  })
  extendedBankAccounts: FetchAllBankAccounts[];

  @Field({
    description: 'Total number of bank accounts available.',
  })
  total_count: number;
}

@ObjectType({
  description: 'Response containing a paginated list of bank accounts.',
})
export class FetchAllBankAccountsResponse {
  @Field({ description: 'Status of the operation.' })
  status: string;

  @Field({ description: 'Human-readable message describing the result.' })
  message: string;

  @Field({
    description: 'Paginated bank account data with total count.',
  })
  data: FetchAllBankAccountsWithTotalCount;
}

@ObjectType({
  description: 'Response returned after changing the status of a bank account.',
})
export class ChangeStatusOfBankAccountResponse {
  @Field({ description: 'Status of the operation.' })
  status: string;

  @Field({ description: 'Human-readable message describing the result.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Result or confirmation message.',
  })
  data: string;
}

@ObjectType({
  description: 'Response containing detailed bank account information.',
})
export class FetchBankAccountDetailsResponse {
  @Field({ description: 'Status of the operation.' })
  status: string;

  @Field({ description: 'Human-readable message describing the result.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Detailed bank account information.',
  })
  data: FetchBankAccountDetails;
}

@ObjectType({
  description: 'Basic bank account information used in selection lists.',
})
export class GetBankAccountListRes {
  @Field({ description: 'Unique identifier of the record.' })
  id: string;

  @Field({ description: 'Unique identifier of the bank account.' })
  bank_account_id: number;

  @Field({ description: 'Name of the bank account.' })
  account_name: string;

  @Field({ description: 'Type of the bank account.' })
  account_type: string;
}

@ObjectType({
  description:
    'Grouped bank account lists based on payment or retention usage.',
})
export class GetBankAccountList {
  @Field(() => [GetBankAccountListRes], {
    nullable: true,
    description: 'Accounts used as payment-from accounts.',
  })
  payment_from_account?: GetBankAccountListRes[];

  @Field(() => [GetBankAccountListRes], {
    nullable: true,
    description: 'Accounts used as payment-to accounts.',
  })
  payment_to_account?: GetBankAccountListRes[];

  @Field(() => [GetBankAccountListRes], {
    nullable: true,
    description: 'Accounts used as retention-from accounts.',
  })
  retention_from_account?: GetBankAccountListRes[];
}

@ObjectType({
  description: 'Response containing categorized bank account lists.',
})
export class GetBankAccountListResponse {
  @Field({ description: 'Status of the operation.' })
  status: string;

  @Field({ description: 'Human-readable message describing the result.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Categorized bank account list data.',
  })
  data?: GetBankAccountList;
}
