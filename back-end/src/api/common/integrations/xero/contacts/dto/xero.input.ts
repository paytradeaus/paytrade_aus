import { InputType, Field, PartialType } from '@nestjs/graphql';
import { Group } from 'src/entities/user-details.entity';
import { MappedStatuses } from 'src/libs/@paytrade-types/paytrade-types';

@InputType({
  description: 'Input for fetching Xero contacts that have already been mapped',
})
export class GetMappedXeroContactListsInput {
  @Field({ description: 'Company identifier for which contacts are retrieved' })
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

  @Field({ nullable: true, description: 'Search keyword to filter contacts' })
  search?: string;

  @Field({ nullable: true, description: 'Field used for sorting the results' })
  sorting_field: string;

  @Field({ nullable: true, description: 'Sorting order: ASC or DESC' })
  sorting_order: 'ASC' | 'DESC';
}

@InputType({
  description:
    'Input for fetching Xero contacts with optional mapped status filter',
})
export class GetXeroContactListsInput {
  @Field({ description: 'Company identifier for which contacts are retrieved' })
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

  @Field({ nullable: true, description: 'Search keyword to filter contacts' })
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
    'Input for fetching Paytrade contacts with optional mapped status filter',
})
export class GetPaytradeContactListsInput {
  @Field({ description: 'Company identifier for which contacts are retrieved' })
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

  @Field({ nullable: true, description: 'Search keyword to filter contacts' })
  search?: string;

  @Field({ nullable: true, description: 'Filter by mapped status' })
  mapped_status?: MappedStatuses;

  @Field({ nullable: true, description: 'Field used for sorting the results' })
  sorting_field: string;

  @Field({ nullable: true, description: 'Sorting order: ASC or DESC' })
  sorting_order: 'ASC' | 'DESC';
}

@InputType({
  description: 'Input for specifying contacts that are yet to be mapped',
})
export class YetToMapContactsInput {
  @Field({ description: 'Identifier of the Xero contact to be mapped' })
  contact_id: string;

  @Field({
    description: 'Paytrade contact identifier to map the Xero contact to',
  })
  pt_contact_id: number;
}
