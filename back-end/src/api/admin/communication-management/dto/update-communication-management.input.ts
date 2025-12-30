import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType({
  description: 'Input for updating a communication management entry by ID',
})
export class UpdateCommunicationManagementInput {
  @Field(() => Int, {
    description:
      'Unique identifier of the communication management record to update',
  })
  id: number;
}
