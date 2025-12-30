import { InputType, Field } from '@nestjs/graphql';
import {
  ClientSupplierType,
  PaymentTypes,
} from 'src/libs/@paytrade-types/paytrade-types';

@InputType({
  description:
    'Input filters for fetching payment claims, payments, and retentions list.',
})
export class FetchFiltersOfPaymentClaimsPaymentsAndRetentionsListInput {
  @Field({ description: 'ID of the business for which to fetch records.' })
  company_id: number;

  @Field({
    nullable: true,
    description: 'ID of the project to filter the list.',
  })
  project_id?: number;

  @Field({
    nullable: true,
    description: 'ID of the contract to filter the list.',
  })
  contract_id?: number;

  @Field({
    nullable: true,
    description: 'ID of the client or supplier to filter the list.',
  })
  client_supplier_id?: number;

  @Field({
    nullable: true,
    description:
      'Type of client or supplier to filter the list (e.g., Client, Supplier).',
  })
  client_supplier_type?: ClientSupplierType;
}
