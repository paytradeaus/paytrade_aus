import { InputType, Int, Field } from '@nestjs/graphql';
import {
  Integrations,
  IntegrationStatus,
  ProviderTpe,
} from 'src/libs/@paytrade-types/paytrade-types';

@InputType({ description: 'Input payload for creating a new integration' })
export class CreateIntegrationInput {
  @Field({
    description: 'Company identifier for which the integration is created',
  })
  company_id: number;

  @Field({
    description: 'Integration provider name',
  })
  integration_name: Integrations;

  @Field({
    description: 'Current status of the integration',
  })
  integration_status: IntegrationStatus;
}

@InputType({ description: 'Input payload to initiate Adatree integration' })
export class integrateAdatreeInput {
  @Field({
    description: 'Company identifier for Adatree integration',
  })
  company_id: number;
}

@InputType({
  description: 'Input payload for updating an existing integration',
})
export class UpdateIntegrationInput {
  @Field({
    description: 'Unique identifier of the integration',
  })
  integration_id: number;

  @Field({
    description: 'Updated status of the integration',
  })
  integration_status: IntegrationStatus;
}

@InputType({
  description: 'Input payload for retrieving a paginated list of integrations',
})
export class GetIntegrationListsInput {
  @Field({
    description: 'Company identifier to fetch integrations for',
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

  @Field({
    nullable: true,
    description: 'Filter integrations by status',
  })
  integration_status?: string;

  @Field({
    nullable: true,
    description: 'Field name used for sorting results',
  })
  sorting_field?: string;

  @Field({
    nullable: true,
    description: 'Sorting order: ASC or DESC',
  })
  sorting_order?: 'ASC' | 'DESC';
}
