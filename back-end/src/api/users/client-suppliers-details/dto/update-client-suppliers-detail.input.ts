import { Group } from 'src/entities/user-details.entity';
import { CreateClientSuppliersDetailInput } from './create-client-suppliers-detail.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType({
  description:
    'Input type for updating details of an existing client or supplier.',
})
export class UpdateClientSuppliersDetailInput extends PartialType(
  CreateClientSuppliersDetailInput,
) {
  @Field({
    description: 'Unique identifier of the client or supplier to be updated.',
  })
  id: string;

  @Field(() => [String], {
    nullable: true,
    description: 'List of account IDs to remove from the client/supplier.',
  })
  removed_account_ids?: string[];

  @Field({
    nullable: true,
    description:
      'Flag indicating if the client/supplier record is marked as deleted.',
  })
  is_deleted?: boolean;

  @Field({
    nullable: true,
    description: 'User ID of the logged-in user performing the update.',
  })
  updated_by?: number;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the record was last updated.',
  })
  updated_on?: Date;

  @Field({
    nullable: true,
    description:
      'Group (User, Admin, System) under which the record was updated.',
  })
  updated_group?: Group;
}
