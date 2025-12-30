import { Field, InputType } from '@nestjs/graphql';
import { CashRetentionType } from 'src/libs/@paytrade-types/paytrade-types';

@InputType({
  description:
    'Input type to fetch client or supplier details for a payment claim.',
})
export class FetchClientSupplierDetailsForPaymentClaimInput {
  @Field({
    description:
      'ID of the contract for which client or supplier details are required.',
  })
  contract_id: number;

  @Field({
    description:
      'Type of cash retention associated with the payment claim (e.g., Claim, Retention claim).',
  })
  cash_retention_type: CashRetentionType;

  @Field({
    nullable: true,
    description:
      'Optional payment ID if details are required for a specific payment.',
  })
  payment_id: number;
}

@InputType({
  description:
    'Input type to fetch all projects linked to a specific client or supplier.',
})
export class GetProjectsListInput {
  @Field({ description: 'Unique identifier of the client or supplier.' })
  client_supplier_id: number;
}

@InputType({
  description:
    'Input type to fetch all contracts for a specific client/supplier and project.',
})
export class GetContractsListInput {
  @Field({ description: 'Unique identifier of the client or supplier.' })
  client_supplier_id: number;

  @Field({
    description: 'Unique identifier of the project to filter contracts.',
  })
  project_id: number;
}
