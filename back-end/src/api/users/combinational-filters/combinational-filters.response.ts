import { ObjectType, Field } from '@nestjs/graphql';
import {
  BankAccountType,
  ClientSupplierType,
} from 'src/libs/@paytrade-types/paytrade-types';
import { ApiStatusType } from 'src/libs/@response-framer/response-framer';

//Fetch filters of payment claims.
@ObjectType({
  description:
    'Represents a project for filtering payment claims, payments, and retentions.',
})
export class Projects {
  @Field({ description: 'Unique identifier of the project.' })
  project_id: number;

  @Field({ description: 'Name of the project.' })
  project_name: string;
}

@ObjectType({
  description:
    'Represents a contract for filtering payment claims, payments, and retentions.',
})
export class Contracts {
  @Field({ description: 'Unique identifier of the contract.' })
  contract_id: number;

  @Field({ description: 'Name of the contract.' })
  contract_name: string;
}

@ObjectType({
  description: 'Represents an account from which payments are made.',
})
export class FromAccounts {
  @Field({
    nullable: true,
    description: 'Unique identifier of the from account.',
  })
  from_account_id: number;

  @Field({ nullable: true, description: 'Name of the from account.' })
  from_account_name: string;

  @Field({
    nullable: true,
    description:
      'Type of the bank account (e.g., Retention Trust Account, Project Trust Account, Cash Account).',
  })
  from_account_type: BankAccountType;
}

@ObjectType({
  description:
    'Represents a client or supplier for filtering payment claims, payments, and retentions.',
})
export class ClientsSuppliers {
  @Field({ description: 'Unique identifier of the client or supplier.' })
  client_supplier_id: number;

  @Field({ nullable: true, description: 'Name of the client or supplier.' })
  client_supplier_name: string;

  @Field({
    description: 'Type of the client or supplier (e.g., Client, Supplier).',
  })
  client_supplier_type: ClientSupplierType;
}

@ObjectType({
  description:
    'Filters available for fetching payment claims, payments, and retentions list.',
})
export class FetchFiltersOfPaymentClaimsPaymentsAndRetentionsList {
  @Field(() => [Projects], {
    nullable: true,
    description: 'List of projects available for filtering.',
  })
  projects: Projects[];

  @Field(() => [Contracts], {
    nullable: true,
    description: 'List of contracts available for filtering.',
  })
  contracts: Contracts[];

  @Field(() => [FromAccounts], {
    nullable: true,
    description: 'List of accounts from which payments can be made.',
  })
  fromAccounts: FromAccounts[];

  @Field(() => [ClientsSuppliers], {
    nullable: true,
    description: 'List of clients or suppliers available for filtering.',
  })
  clientSuppliers: ClientsSuppliers[];
}

@ObjectType({
  description:
    'Response containing available filters for payment claims, payments, and retentions list.',
})
export class FetchFiltersOfPaymentClaimsPaymentsAndRetentionsListResponse {
  @Field({ description: 'Status of the API response.' })
  status: ApiStatusType;

  @Field({
    description: 'Message providing additional details about the API response.',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing the available filters.',
  })
  data: FetchFiltersOfPaymentClaimsPaymentsAndRetentionsList;
}
