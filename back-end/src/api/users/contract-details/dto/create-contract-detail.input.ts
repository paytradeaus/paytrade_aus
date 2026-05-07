import { InputType, Int, Field } from '@nestjs/graphql';
import { IsIn, IsOptional } from 'class-validator';
import {
  ClientSupplierType,
  RelatedEntity,
} from 'src/entities/client-suppliers-details.entity';
import {
  ClientSupplierRole,
  ContractStatus,
  RetentionType,
} from 'src/entities/contract-details.entity';
import { ProjectRole } from 'src/entities/project-details.entity';
import { Group } from 'src/entities/user-details.entity';

@InputType({ description: 'Input type for creating a new contract detail.' })
export class CreateContractDetailInput {
  @Field(() => Int, {
    description: 'ID of the business associated with the contract.',
  })
  company_id: number;

  // @Field()
  // contract_id: number;

  @Field({ description: 'Name of the contract.' })
  contract_name: string;

  @Field({
    description:
      'Role of the client or supplier in the contract (e.g., Principal, Head Contractor, Related Entity Sub Contractor, Sub Contractor).',
  })
  client_supplier_role: ClientSupplierRole;

  @Field({ nullable: true, description: 'Type of the contract (optional).' })
  contract_type: string;

  @Field({
    nullable: true,
    description:
      "Billing type of the contract: 'Fixed' (default — warning shown when claim exceeds pending) or 'Hourly' (auto-create variation for shortfall when claim exceeds pending).",
  })
  @IsOptional()
  @IsIn(['Fixed', 'Hourly'], {
    message: "contract_billing_type must be either 'Fixed' or 'Hourly'",
  })
  contract_billing_type?: 'Fixed' | 'Hourly';

  @Field({
    nullable: true,
    description:
      'Current status of the contract (optional) (e.g., Draft, In Progress, Completed, Archived, Deleted).',
  })
  contract_status: ContractStatus;

  @Field({ description: 'Date when the contract was created or signed.' })
  contract_date: Date;

  @Field({
    description: 'ID of the project associated with the contract.',
  })
  project_id: number;

  @Field({
    description:
      'Role of the project in the contract (e.g., Principal, Head Contractor, Sub Contractor).',
  })
  project_role: ProjectRole;

  @Field({
    description: 'ID of the client or supplier associated with the contract.',
  })
  client_supplier_id: number;

  @Field({
    description: 'Type of the client or supplier (e.g., Client, Supplier).',
  })
  client_supplier_type: ClientSupplierType;

  @Field({ description: 'Entity related to this contract (e.g., Yes, No).' })
  related_entity: RelatedEntity;

  @Field({
    nullable: true,
    description:
      'Type of retention for the contract (optional) (e.g., Cash, Bank guaranteed, None).',
  })
  retention_type: RetentionType;

  @Field({ description: 'Payment terms for the contract in days.' })
  payment_terms: number;

  @Field({ description: 'Initial contract sum (total value of the contract).' })
  initial_contract_sum: number;

  @Field({ description: 'Contract start date.' })
  contract_start_date: Date;

  @Field({ description: 'End date of the defect liability period.' })
  defect_liability_end_date: Date;

  @Field({
    nullable: true,
    description: 'Bank account ID from which payments will be made (optional).',
  })
  payment_from_account: number;

  @Field({
    nullable: true,
    description:
      'Bank account ID from which retention will be deducted (optional).',
  })
  retention_from_account: number;

  @Field({
    nullable: true,
    description: 'Bank account ID to which payments will be sent (optional).',
  })
  payment_to_account: number;

  @Field({
    nullable: true,
    description: 'ID of the user who created the contract (optional).',
  })
  created_by?: number;

  @Field({
    nullable: true,
    description: 'Timestamp when the contract was created (optional).',
  })
  created_on?: Date;

  @Field({
    nullable: true,
    description: 'Group that created the contract (optional).',
  })
  created_group?: Group;
}
