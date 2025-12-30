import { Group } from 'src/entities/user-details.entity';
import { CreateContractDetailInput } from './create-contract-detail.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType({
  description:
    'Input type for updating an existing contract detail. All fields from CreateContractDetailInput are optional, except `id` which is required.',
})
export class UpdateContractDetailInput extends PartialType(
  CreateContractDetailInput,
) {
  @Field({ description: 'Unique identifier of the contract to update.' })
  id: string;

  @Field({
    nullable: true,
    description: 'User ID of the logged in user performing the update.',
  })
  updated_by?: number;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the contract record was updated.',
  })
  updated_on?: Date;

  @Field({
    nullable: true,
    description:
      'Group (User, Admin, System) under which the record update is performed.',
  })
  updated_group?: Group;
}
