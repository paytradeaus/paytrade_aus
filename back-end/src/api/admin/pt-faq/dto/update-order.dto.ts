import { InputType, Field } from '@nestjs/graphql';

@InputType({
  description: 'Input type for updating the display order of FAQ entries.',
})
export class UpdateOrderInput {
  @Field({
    nullable: true,
    description: 'The unique identifier of the FAQ entry to update.',
  })
  faqId?: string;

  @Field({
    nullable: true,
    description:
      'The unique identifier of the FAQ entry that previously occupied the target position. Can be null if there is no previous FAQ.',
  })
  previousFaqId: string | null;

  @Field({
    nullable: true,
    description:
      'The category ID of the FAQ entry, if updating the order within a specific category.',
  })
  category?: string;
}
