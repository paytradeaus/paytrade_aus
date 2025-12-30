import { ObjectType, Field, Int } from '@nestjs/graphql';
import {
  ClientSupplierStatus,
  ClientSupplierType,
} from 'src/entities/client-suppliers-details.entity';

@ObjectType({
  description:
    'Represents the details of a client/supplier for existence checks.',
})
export class CheckExistenceForClientRes {
  @Field({ description: 'Unique identifier of the record.' })
  id: string;

  @Field({
    description:
      'Identifier of the business associated with the client/supplier.',
  })
  company_id: number;

  @Field({ description: 'Unique identifier of the client or supplier.' })
  client_supplier_id: number;

  @Field({ description: 'Name of the client or supplier.' })
  client_supplier_name: string;

  @Field({
    description: 'Type of client or supplier (e.g., Client, Supplier).',
  })
  client_supplier_type: ClientSupplierType;

  @Field({
    description:
      'Current status of the client or supplier (e.g., Draft, Completed).',
  })
  client_supplier_status: ClientSupplierStatus;

  @Field({ description: 'Email ID of the client or supplier.' })
  client_email_id: string;
}

@ObjectType({
  description: 'Response for checking existence of clients or suppliers.',
})
export class CheckExistenceForClientResponse {
  @Field({ description: 'Status of the API response.' })
  status: string;

  @Field({
    description: 'Message providing additional context about the response.',
  })
  message: string;

  @Field(() => [CheckExistenceForClientRes], {
    nullable: true,
    description:
      'List of clients/suppliers matching the existence check criteria.',
  })
  data?: CheckExistenceForClientRes[];
}
