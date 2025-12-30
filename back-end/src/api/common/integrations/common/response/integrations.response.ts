import { ObjectType, Field, Int } from '@nestjs/graphql';
import {
  Integrations,
  IntegrationStatus,
  ProviderTpe,
} from 'src/libs/@paytrade-types/paytrade-types';

@ObjectType({ description: 'Details of an integrated provider for a company' })
export class IntegrationDetails {
  @Field({
    description: 'Unique identifier of the integration record',
  })
  id: string;

  @Field({
    description: 'Integration master ID',
  })
  integration_id: number;

  @Field({
    description: 'Company identifier associated with the integration',
  })
  company_id: number;

  @Field({
    description: 'Name of the integration provider',
  })
  integration_name: Integrations;

  @Field({
    description: 'Type of integration provider',
  })
  integration_type: ProviderTpe;

  @Field({
    description: 'Current status of the integration',
  })
  integration_status: IntegrationStatus;

  @Field({
    description: 'Date when the integration was created or activated',
  })
  integration_date: Date;
}

@ObjectType({ description: 'Response wrapper for integration details' })
export class IntegrationDetailsResponse {
  @Field({
    description: 'Response status',
  })
  status: string;

  @Field({
    description: 'Response message',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Integration details payload',
  })
  data?: IntegrationDetails;
}

@ObjectType({
  description: 'Response returned after initiating Adatree integration',
})
export class integrateAdatreeResponse {
  @Field({
    description: 'Response status',
  })
  status: string;

  @Field({
    description: 'Response message',
  })
  message: string;
}

@ObjectType({ description: 'Paginated list of integrations' })
export class ViewIntegrationList {
  @Field(() => [IntegrationDetails], {
    nullable: true,
    description: 'List of integrations',
  })
  integration_list: IntegrationDetails[];

  @Field({
    description: 'Total number of integrations available',
  })
  total_count: Number;
}

@ObjectType({ description: 'Response wrapper for integration list view' })
export class ViewIntegrationListResponse {
  @Field({
    description: 'Response status',
  })
  status: string;

  @Field({
    description: 'Response message',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Integration list payload',
  })
  data?: ViewIntegrationList;
}
