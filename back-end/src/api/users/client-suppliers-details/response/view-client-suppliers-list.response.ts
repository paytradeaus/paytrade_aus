import { ObjectType, Field } from '@nestjs/graphql';
import { ViewClientSuppliersRes } from './view-client-suppliers.response';

@ObjectType({
  description:
    'Represents the list of client/supplier records along with the total count.',
})
export class ViewClientSuppliersListRes {
  @Field(() => [ViewClientSuppliersRes], {
    nullable: true,
    description: 'List of client/supplier records.',
  })
  client_suppliers_list: ViewClientSuppliersRes[];

  @Field({ description: 'Total number of client/supplier records.' })
  total_count: number;
}

@ObjectType({
  description: 'Response wrapper for fetching client/supplier list.',
})
export class ViewClientSuppliersListResponse {
  @Field({ description: 'Status of the API response.' })
  status: string;

  @Field({
    description: 'Message providing additional context about the response.',
  })
  message: string;

  @Field({
    nullable: true,
    description:
      'Optional data containing the list of client/supplier records.',
  })
  data?: ViewClientSuppliersListRes;
}
