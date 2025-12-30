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
