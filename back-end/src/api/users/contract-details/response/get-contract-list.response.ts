import { ObjectType, Field } from '@nestjs/graphql';
import {
  ClientSupplierRole,
  ContractStatus,
  RetentionType,
} from 'src/entities/contract-details.entity';

@ObjectType({
  description: 'Represents a single contract in the contract list.',
})
export class GetContractList {
  @Field({
    nullable: true,
    description: 'Unique identifier of the contract record.',
  })
  id?: string;

  @Field({ nullable: true, description: 'Identifier of the contract.' })
  contract_id?: number;

  @Field({ nullable: true, description: 'Name or title of the contract.' })
  contract_name?: string;

  @Field({
    nullable: true,
    description:
      'Role of the client or supplier in the contract (e.g., Principal, Head Contractor, Related Entity Sub Contractor, Sub Contractor).',
  })
  client_supplier_role?: ClientSupplierRole;

  @Field({ nullable: true, description: 'Type of the contract.' })
  contract_type?: string;

  @Field({
    nullable: true,
    description:
      'Current status of the contract (e.g., Draft, In Progress, Completed, Archived, Deleted).',
  })
  contract_status?: ContractStatus;

  @Field({
    nullable: true,
    description: 'Date when the contract was created or signed.',
  })
  contract_date?: Date;

  @Field({
    nullable: true,
    description: 'Identifier of the associated project.',
  })
  project_id?: number;

  @Field({
    nullable: true,
    description:
      'Identifier of the client or supplier associated with the contract.',
  })
  client_supplier_id?: number;

  @Field({
    nullable: true,
    description:
      'Type of retention associated with the contract (e.g., Cash, Bank guaranteed, None).',
  })
  retention_type?: RetentionType;

  @Field({
    nullable: true,
    description: 'Payment terms specified in the contract.',
  })
  payment_terms?: number;

  @Field({
    nullable: true,
    description: 'Initial contract sum before formatting.',
  })
  initial_contract_sum?: number;

  @Field({
    nullable: true,
    description:
      'Initial contract sum formatted as a string (e.g., with currency).',
  })
  formatted_initial_contract_sum?: string;

  @Field({
    nullable: true,
    description:
      'Indicates whether a notice has been generated for this contract.',
  })
  notice_generated?: boolean;
}

@ObjectType({ description: 'Response containing a list of contracts.' })
export class GetContractListResponse {
  @Field({ description: 'API response status (e.g., success, error).' })
  status: string;

  @Field({ description: 'Descriptive message about the response.' })
  message: string;

  @Field(() => [GetContractList], {
    nullable: true,
    description: 'List of contracts returned from the query.',
  })
  data?: GetContractList[];
}

@ObjectType({ description: 'Response containing a single contract.' })
export class GetContractResponse {
  @Field({ description: 'API response status (e.g., success, error).' })
  status: string;

  @Field({ description: 'Descriptive message about the response.' })
  message: string;

  @Field({ nullable: true, description: 'Contract data, if found.' })
  data?: GetContractList;
}
