import { InputType, Field, PartialType } from '@nestjs/graphql';
import { MappedStatuses } from 'src/libs/@paytrade-types/paytrade-types';

@InputType({
  description:
    'Input for fetching Xero contracts that have already been mapped',
})
export class GetMappedXeroContractListsInput {
  @Field({
    description: 'Company identifier for which contracts are retrieved',
  })
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

  @Field({ nullable: true, description: 'Search keyword to filter contracts' })
  search?: string;

  @Field({ nullable: true, description: 'Field used for sorting the results' })
  sorting_field: string;

  @Field({ nullable: true, description: 'Sorting order: ASC or DESC' })
  sorting_order: 'ASC' | 'DESC';
}

@InputType({
  description:
    'Input for fetching Xero contracts with optional mapped status filter',
})
export class GetXeroContractListsInput {
  @Field({
    description: 'Company identifier for which contracts are retrieved',
  })
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

  @Field({ nullable: true, description: 'Search keyword to filter contracts' })
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
    'Input for fetching Paytrade contracts with optional mapped status filter',
})
export class GetPaytradeContractListsInput {
  @Field({
    description: 'Company identifier for which contracts are retrieved',
  })
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

  @Field({ nullable: true, description: 'Search keyword to filter contracts' })
  search?: string;

  @Field({ nullable: true, description: 'Filter by mapped status' })
  mapped_status?: MappedStatuses;

  @Field({ nullable: true, description: 'Field used for sorting the results' })
  sorting_field: string;

  @Field({ nullable: true, description: 'Sorting order: ASC or DESC' })
  sorting_order: 'ASC' | 'DESC';
}

@InputType({
  description: 'Input for specifying contracts that are yet to be mapped',
})
export class YetToMapContractsInput {
  @Field({ description: 'Identifier of the Xero contract to be mapped' })
  contract_id: string;

  @Field({
    description: 'Paytrade contract identifier to map the Xero contract to',
  })
  pt_contract_id: number;
}
