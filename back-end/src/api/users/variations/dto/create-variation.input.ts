import { InputType, Int, Field } from '@nestjs/graphql';
import { Group } from 'src/entities/user-details.entity';
import { VariationStatus } from 'src/entities/variation-details.entity';

@InputType({
  description:
    'Input type for creating a new variation associated with a project and contract.',
})
export class CreateVariationInput {
  @Field({ description: 'ID of the business associated with the variation.' })
  company_id: number;

  // @Field()
  // variation_id: number; // This field is commented out, likely because it will be auto-generated

  @Field({ description: 'Name of the variation.' })
  variation_name: string;

  @Field({ description: 'Current status of the variation.' })
  variation_status: VariationStatus;

  @Field({ description: 'ID of the project this variation belongs to.' })
  project_id: number;

  @Field({
    description: 'ID of the contract this variation is associated with.',
  })
  contract_id: number;

  @Field({ description: 'Monetary amount for the variation.' })
  variation_amount: number;

  @Field({
    nullable: true,
    description: 'User ID of the logged-in user who created this variation.',
  })
  created_by: number;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the variation record was created.',
  })
  created_on: Date;

  @Field({
    nullable: true,
    description:
      'Group (User, Admin, System) under which the variation record was created.',
  })
  created_group: Group;
}
