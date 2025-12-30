import { ObjectType, Field } from '@nestjs/graphql';
import { MappedStatuses } from 'src/libs/@paytrade-types/paytrade-types';

@ObjectType({ description: 'Represents a single Xero contract record' })
export class GetXeroContracts {
  @Field({
    nullable: true,
    description: 'Internal identifier of the Xero contract',
  })
  id: string;

  @Field({ nullable: true, description: 'Xero contract identifier' })
  contract_id: string;

  @Field({ nullable: true, description: 'Tenant identifier in Xero' })
  tenant_id: string;

  @Field({ nullable: true, description: 'Name of the Xero contract' })
  contract_name: string;

  @Field({ nullable: true, description: 'Status of the Xero contract' })
  contract_status: string;

  @Field({ nullable: true, description: 'Mapped status to Paytrade, if any' })
  mapped_status: MappedStatuses;

  @Field({
    nullable: true,
    description: 'Paytrade contract ID this Xero contract is mapped to',
  })
  pt_contract_id: number;

  @Field({
    nullable: true,
    description: 'Paytrade contract name this Xero contract is mapped to',
  })
  pt_contract_name: string;
}

@ObjectType({ description: 'Paginated list of Xero contracts' })
export class GetXeroContractsList {
  @Field(() => [GetXeroContracts], {
    nullable: true,
    description: 'List of Xero contracts',
  })
  contract_list: GetXeroContracts[];

  @Field({ description: 'Total number of Xero contracts available' })
  total_count: Number;
}

@ObjectType({ description: 'Response wrapper for a list of Xero contracts' })
export class GetXeroContractsListResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({ nullable: true, description: 'Xero contracts list payload' })
  data?: GetXeroContractsList;
}

@ObjectType({ description: 'Response wrapper for a single Xero contract' })
export class GetXeroContractsResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({ nullable: true, description: 'Single Xero contract payload' })
  data?: GetXeroContracts;
}

@ObjectType({
  description: 'Represents a Paytrade contract record for list responses',
})
export class GetPaytradeContractsListRes {
  @Field({
    nullable: true,
    description: 'Internal identifier of the Paytrade contract',
  })
  id: string;

  @Field({ nullable: true, description: 'Paytrade contract identifier' })
  contract_id: string;

  @Field({ nullable: true, description: 'Name of the Paytrade contract' })
  contract_name: string;

  @Field({ nullable: true, description: 'Status of the Paytrade contract' })
  contract_status: string;
}

@ObjectType({ description: 'Represents a detailed Paytrade contract record' })
export class GetPaytradeContracts {
  @Field({
    nullable: true,
    description: 'Internal identifier of the Paytrade contract',
  })
  id: string;

  @Field({ nullable: true, description: 'Paytrade contract identifier' })
  contract_id: number;

  @Field({ nullable: true, description: 'Name of the Paytrade contract' })
  contract_name: string;

  @Field({ nullable: true, description: 'Status of the Paytrade contract' })
  contract_status: string;

  @Field({ nullable: true, description: 'Mapped status to Xero, if any' })
  mapped_status: MappedStatuses;

  @Field({
    nullable: true,
    description: 'Xero contract ID this Paytrade contract is mapped to',
  })
  xero_contract_id: string;
}

@ObjectType({ description: 'Paginated list of Paytrade contracts' })
export class GetPaytradeContractsList {
  @Field(() => [GetPaytradeContracts], {
    nullable: true,
    description: 'List of Paytrade contracts',
  })
  contract_list: GetPaytradeContracts[];

  @Field({ description: 'Total number of Paytrade contracts available' })
  total_count: Number;
}

@ObjectType({
  description: 'Response wrapper for a list of Paytrade contracts',
})
export class GetPaytradeContractsListResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({ nullable: true, description: 'Paytrade contracts list payload' })
  data: GetPaytradeContractsList;
}

@ObjectType({ description: 'Response wrapper for a single Paytrade contract' })
export class GetPaytradeContractsResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({ nullable: true, description: 'Single Paytrade contract payload' })
  data?: GetPaytradeContracts;
}
