import { InputType, Field, PartialType } from '@nestjs/graphql';
import { Group } from 'src/entities/user-details.entity';
import { MappedStatuses } from 'src/libs/@paytrade-types/paytrade-types';

@InputType({ description: 'Input for fetching mapped Xero project lists' })
export class GetMappedXeroProjectListsInput {
  @Field({ description: 'Company ID for which projects are fetched' })
  company_id: number;

  @Field({
    defaultValue: null,
    nullable: true,
    description: 'Page number for pagination',
  })
  page_number?: number;

  @Field({
    defaultValue: null,
    nullable: true,
    description: 'Number of items per page',
  })
  page_size?: number;

  @Field({ nullable: true, description: 'Search keyword to filter projects' })
  search?: string;

  @Field({ nullable: true, description: 'Field used for sorting the results' })
  sorting_field: string;

  @Field({ nullable: true, description: 'Sorting order: ASC or DESC' })
  sorting_order: 'ASC' | 'DESC';
}

@InputType({
  description: 'Input for fetching Xero project lists with mapping status',
})
export class GetXeroProjectListsInput {
  @Field({ description: 'Company ID for which projects are fetched' })
  company_id: number;

  @Field({
    defaultValue: null,
    nullable: true,
    description: 'Page number for pagination',
  })
  page_number?: number;

  @Field({
    defaultValue: null,
    nullable: true,
    description: 'Number of items per page',
  })
  page_size?: number;

  @Field({ nullable: true, description: 'Search keyword to filter projects' })
  search?: string;

  @Field({ nullable: true, description: 'Mapping status to filter projects' })
  mapped_status: MappedStatuses;

  @Field({ nullable: true, description: 'Field used for sorting the results' })
  sorting_field: string;

  @Field({ nullable: true, description: 'Sorting order: ASC or DESC' })
  sorting_order: 'ASC' | 'DESC';
}

@InputType({
  description:
    'Input for fetching Paytrade project lists with optional mapping status',
})
export class GetPaytradeProjectListsInput {
  @Field({ description: 'Company ID for which projects are fetched' })
  company_id: number;

  @Field({
    defaultValue: null,
    nullable: true,
    description: 'Page number for pagination',
  })
  page_number?: number;

  @Field({
    defaultValue: null,
    nullable: true,
    description: 'Number of items per page',
  })
  page_size?: number;

  @Field({ nullable: true, description: 'Search keyword to filter projects' })
  search?: string;

  @Field({
    nullable: true,
    description: 'Optional mapping status to filter projects',
  })
  mapped_status?: MappedStatuses;

  @Field({ nullable: true, description: 'Field used for sorting the results' })
  sorting_field: string;

  @Field({ nullable: true, description: 'Sorting order: ASC or DESC' })
  sorting_order: 'ASC' | 'DESC';
}

@InputType({
  description:
    'Input for projects that are yet to be mapped between Xero and Paytrade',
})
export class YetToMapProjectsInput {
  @Field({ description: 'Xero project ID to be mapped' })
  project_id: string;

  @Field({ description: 'Corresponding Paytrade project ID to map' })
  pt_project_id: number;
}
