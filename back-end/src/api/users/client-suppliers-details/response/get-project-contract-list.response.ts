import { ObjectType, Field } from '@nestjs/graphql';
import {
  ClientSupplierRole,
  ContractStatus,
} from 'src/entities/contract-details.entity';
import {
  Eligibility,
  ProjectRole,
  ProjectStatus,
  RetentionType,
} from 'src/entities/project-details.entity';

@ObjectType({ description: 'Represents a single project record.' })
export class GetProjectsListRes {
  @Field({ nullable: true, description: 'Unique identifier of the record.' })
  id: string;

  @Field({ nullable: true, description: 'Unique identifier of the project.' })
  project_id: number;

  @Field({ nullable: true, description: 'Name of the project.' })
  project_name: string;

  @Field({ nullable: true, description: 'Role associated with the project.' })
  project_role: ProjectRole;

  @Field({ nullable: true, description: 'Current status of the project.' })
  project_status: ProjectStatus;

  @Field({ nullable: true, description: 'Eligibility for PTA compliance.' })
  pta_eligibility: Eligibility;

  @Field({ nullable: true, description: 'Eligibility for RTA compliance.' })
  rta_eligibility: Eligibility;
}

@ObjectType({ description: 'Response wrapper for a list of projects.' })
export class GetProjectListResponse {
  @Field({ description: 'Status of the API response.' })
  status: string;

  @Field({
    description: 'Message providing additional context about the response.',
  })
  message: string;

  @Field(() => [GetProjectsListRes], {
    nullable: true,
    description: 'Optional list of projects.',
  })
  data?: GetProjectsListRes[];
}

@ObjectType({ description: 'Represents a single contract record.' })
export class GetContractsListRes {
  @Field({ nullable: true, description: 'Unique identifier of the record.' })
  id: string;

  @Field({ nullable: true, description: 'Unique identifier of the contract.' })
  contract_id: number;

  @Field({ nullable: true, description: 'Name of the contract.' })
  contract_name: string;

  @Field({
    nullable: true,
    description: 'Role of the client or supplier associated with the contract.',
  })
  client_supplier_role: ClientSupplierRole;

  @Field({ nullable: true, description: 'Type of contract.' })
  contract_type: string;

  @Field({ nullable: true, description: 'Current status of the contract.' })
  contract_status: ContractStatus;

  @Field({
    nullable: true,
    description: 'Date the contract was created or signed.',
  })
  contract_date: Date;

  @Field({
    nullable: true,
    description: 'Unique identifier of the associated project.',
  })
  project_id: number;

  @Field({
    nullable: true,
    description: 'Unique identifier of the client or supplier.',
  })
  client_supplier_id: number;

  @Field({
    nullable: true,
    description: 'Type of retention associated with the contract.',
  })
  retention_type: RetentionType;

  @Field({ nullable: true, description: 'Payment terms in days.' })
  payment_terms: number;

  @Field({ nullable: true, description: 'Initial sum of the contract.' })
  initial_contract_sum: number;

  @Field({
    nullable: true,
    description: 'End date for defect liability period.',
  })
  defect_liability_end_date: Date;

  @Field({ nullable: true, description: 'Variation amount in the contract.' })
  variation_amount: number;

  @Field({
    nullable: true,
    description: 'Claim amount associated with the contract.',
  })
  claim_amount: number;

  @Field({
    nullable: true,
    description: 'Formatted initial contract sum for display purposes.',
  })
  formatted_initial_contract_sum: string;

  @Field({
    nullable: true,
    description: 'Formatted variation amount for display purposes.',
  })
  formatted_variation_amount: string;

  @Field({
    nullable: true,
    description: 'Formatted claim amount for display purposes.',
  })
  formatted_claim_amount: string;
}

@ObjectType({ description: 'Response wrapper for a list of contracts.' })
export class GetContractsListResponse {
  @Field({ description: 'Status of the API response.' })
  status: string;

  @Field({
    description: 'Message providing additional context about the response.',
  })
  message: string;

  @Field(() => [GetContractsListRes], {
    nullable: true,
    description: 'Optional list of contracts.',
  })
  data?: GetContractsListRes[];
}
