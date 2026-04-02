import { InputType, Field, PartialType } from '@nestjs/graphql';
import { MappedStatuses } from 'src/libs/@paytrade-types/paytrade-types';

@InputType({
  description: 'Input for fetching Xero accounts that have already been mapped',
})
export class GetMappedXeroAccountListsInput {
  @Field({ description: 'Company identifier for which accounts are retrieved' })
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

  @Field({ nullable: true, description: 'Search keyword to filter accounts' })
  search?: string;

  @Field({ nullable: true, description: 'Field used for sorting the results' })
  sorting_field: string;

  @Field({ nullable: true, description: 'Sorting order: ASC or DESC' })
  sorting_order: 'ASC' | 'DESC';
}

@InputType({
  description:
    'Input for fetching Xero accounts with optional mapped status filter',
})
export class GetXeroAccountListsInput {
  @Field({ description: 'Company identifier for which accounts are retrieved' })
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

  @Field({ nullable: true, description: 'Search keyword to filter accounts' })
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
    'Input for fetching Paytrade accounts with optional mapped status filter',
})
export class GetPaytradeAccountListsInput {
  @Field({ description: 'Company identifier for which accounts are retrieved' })
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

  @Field({ nullable: true, description: 'Search keyword to filter accounts' })
  search?: string;

  @Field({ nullable: true, description: 'Filter by mapped status' })
  mapped_status?: MappedStatuses;

  @Field({ nullable: true, description: 'Field used for sorting the results' })
  sorting_field: string;

  @Field({ nullable: true, description: 'Sorting order: ASC or DESC' })
  sorting_order: 'ASC' | 'DESC';
}

@InputType({
  description: 'Input for specifying accounts that are yet to be mapped',
})
export class YetToMapAccountsInput {
  @Field({ description: 'Identifier of the account to be mapped' })
  account_id: string;

  @Field({
    description: 'Paytrade bank account identifier to map the account to',
  })
  pt_bank_account_id: number;
}

@InputType({
  description: 'Input for completing a draft bank account created from Xero with missing fields',
})
export class CompleteBankAccountDraftInput {
  @Field({ description: 'The PayTrade bank account ID of the draft account' })
  bank_account_id: number;

  @Field({ description: 'Company ID' })
  company_id: number;

  @Field({ description: 'Type of the account (Cash Account, Project Trust Account, Retention Trust Account)' })
  account_type: string;

  @Field({ description: 'Financial institution name' })
  financial_institution: string;

  @Field({ description: 'Account opening date' })
  opening_date: string;

  @Field({ description: 'Delegate powers (Yes, No, Not Applicable)' })
  delegate_powers: string;

  @Field({ nullable: true, description: 'Account number' })
  account_number: string;

  @Field({ nullable: true, description: 'BSB number' })
  bsb_number: number;

  @Field({ nullable: true, description: 'Associated cash account ID (required for trust accounts)' })
  associated_cash_account_id: number;

  @Field({ nullable: true, description: 'Trustee ID (required for trust accounts)' })
  trustee_id: number;

  @Field({ nullable: true, description: 'Project IDs (required for trust accounts)' })
  project_ids: string;

  @Field({ nullable: true, description: 'Client/Supplier ID (required for PTA)' })
  client_supplier_id: number;

  @Field({ nullable: true, description: 'Contract date (required for PTA)' })
  contract_date: string;

  @Field({ nullable: true, description: 'Contract practical completion date (required for PTA)' })
  contract_practical_completion_date: string;

  @Field({ nullable: true, description: 'First sub-contract date (required for PTA)' })
  first_sub_contract_date: string;

  @Field({ nullable: true, description: 'Contract value (required for PTA)' })
  contract_value: number;

  @Field({ nullable: true, description: 'Sync log ID to mark as resolved' })
  sync_id: string;
}
