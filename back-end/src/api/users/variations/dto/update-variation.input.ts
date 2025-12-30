import { Group } from 'src/entities/user-details.entity';
import { CreateVariationInput } from './create-variation.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType({
  description: 'Input type for updating an existing variation record.',
})
export class UpdateVariationInput extends PartialType(CreateVariationInput) {
  @Field({ description: 'Unique identifier of the variation to be updated.' })
  id: string;

  @Field({
    nullable: true,
    description: 'Flag indicating whether the variation is archived.',
  })
  is_archived: Boolean;

  @Field({
    nullable: true,
    description: 'User ID of the logged-in user performing the update.',
  })
  updated_by: number;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the variation record was updated.',
  })
  updated_on: Date;

  @Field({
    nullable: true,
    description:
      'Group (User, Admin, System) under which the record is updated.',
  })
  updated_group: Group;
}
