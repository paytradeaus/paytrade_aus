import { ObjectType, Field } from '@nestjs/graphql';
import { ClientSupplierType } from 'src/entities/client-suppliers-details.entity';
import { ContractStatus } from 'src/entities/contract-details.entity';
import { TriggerNoticesData } from '../../notices/notices.response';

@ObjectType({
  description:
    'Represents the details of a contract including related notices.',
})
export class ContractDetails {
  @Field({ description: 'Unique identifier of the contract record.' })
  id: string;

  @Field({
    description: 'Identifier of the business associated with this contract.',
  })
  company_id: number;

  @Field({
    description: 'Identifier of the project associated with this contract.',
  })
  project_id: number;

  @Field({
    description:
      'Identifier of the client or supplier associated with this contract.',
  })
  client_supplier_id: number;

  @Field({ description: 'Identifier of the contract in the system.' })
  contract_id: number;

  @Field({
    nullable: true,
    description:
      'Indicates whether a notice has been generated for this contract.',
  })
  notice_generated?: boolean;

  @Field({ description: 'Name or title of the contract.' })
  contract_name: string;

  @Field({
    nullable: true,
    description:
      'Current status of the contract (e.g., Draft, In Progress, Completed, Archived, Deleted).',
  })
  contract_status?: ContractStatus;

  @Field({
    nullable: true,
    description:
      'Type of client or supplier associated with the contract (e.g., Client, Supplier).',
  })
  client_supplier_type?: ClientSupplierType;

  @Field(() => TriggerNoticesData, {
    nullable: true,
    description: 'Details of notices related to this contract.',
  })
  notices?: TriggerNoticesData;
}

@ObjectType({
  description: 'Standard response for a single contract details query.',
})
export class ContractDetailsResponse {
  @Field({ description: 'API response status (e.g., success, error).' })
  status: string;

  @Field({ description: 'Descriptive message about the response.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Contract details data, if available.',
  })
  data?: ContractDetails;
}

@ObjectType({
  description: 'Response type for checking the existence of contracts.',
})
export class CheckExistenceForContractResponse {
  @Field({ description: 'API response status (e.g., success, error).' })
  status: string;

  @Field({ description: 'Descriptive message about the response.' })
  message: string;

  @Field(() => [ContractDetails], {
    nullable: true,
    description: 'List of contract details that exist, if any.',
  })
  data?: ContractDetails[];
}
