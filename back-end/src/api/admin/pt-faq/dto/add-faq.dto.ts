import { InputType, Field } from '@nestjs/graphql';
import { FaqStatus } from '../../../../entities/admin-faq.entity';

@InputType({ description: 'Input type for adding a new FAQ entry.' })
export class AddFaQInput {
  @Field({ description: 'Question for the FAQ entry.' })
  question: string;

  @Field({ description: 'Answer corresponding to the FAQ question.' })
  answer: string;

  @Field({
    nullable: true,
    description: 'Optional category ID to which this FAQ belongs.',
  })
  categoryId: string;

  @Field({
    nullable: true,
    description: 'Indicates if the FAQ should be shown on the home page.',
  })
  show_in_home?: boolean;

  @Field({
    nullable: true,
    description: 'Status of the FAQ entry (e.g., Active, Inactive, Deleted).',
  })
  faq_status: FaqStatus;
}
