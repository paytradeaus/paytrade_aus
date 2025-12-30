import { ObjectType, Field } from '@nestjs/graphql';
import {
  ClientSupplierStatus,
  ClientSupplierType,
  RelatedEntity,
} from 'src/entities/client-suppliers-details.entity';

@ObjectType({
  description: 'Response wrapper for the list of clients and suppliers.',
})
export class GetClientSuppliersListResponse {
  @Field({ description: 'Status of the API response.' })
  status: string;

  @Field({
    description: 'Message providing additional context about the response.',
  })
  message: string;

  @Field(() => [GetClientSuppliersList], {
    nullable: true,
    description: 'Optional list of clients and suppliers.',
  })
  data?: GetClientSuppliersList[];
}

@ObjectType({ description: 'Represents a single client or supplier record.' })
export class GetClientSuppliersList {
  @Field({ nullable: true, description: 'Unique identifier of the record.' })
  id: string;

  @Field({
    nullable: true,
    description: 'Unique identifier of the client or supplier.',
  })
  client_supplier_id: number;

  @Field({ nullable: true, description: 'Name of the client or supplier.' })
  client_supplier_name: string;

  @Field({ nullable: true, description: 'Type of the client or supplier.' })
  client_supplier_type: ClientSupplierType;

  @Field({ nullable: true, description: 'Status of the client or supplier.' })
  client_supplier_status: ClientSupplierStatus;

  @Field({
    nullable: true,
    description: 'Email address of the client or supplier.',
  })
  client_email_id: string;

  @Field({
    nullable: true,
    description: 'Entity related to the client or supplier.',
  })
  related_entity: RelatedEntity;
}
