import { InputType, Field } from '@nestjs/graphql';
import { FaqStatus } from '../../../../entities/admin-faq.entity';

@InputType({ description: 'Input type for updating an existing FAQ entry.' })
export class UpdateFaQInput {
  @Field({ description: 'Unique identifier of the FAQ entry to update.' })
  id: string;

  @Field({
    nullable: true,
    description: 'Updated question text for the FAQ entry.',
  })
  question?: string;

  @Field({
    nullable: true,
    description: 'Updated answer text for the FAQ entry.',
  })
  answer?: string;

  @Field({
    nullable: true,
    description: 'Indicates whether the FAQ should be shown on the home page.',
  })
  show_in_home?: boolean;

  @Field({
    nullable: true,
    description:
      'Updated status of the FAQ entry (e.g., Active, Inactive, Deleted).',
  })
  faq_status?: FaqStatus;

  @Field({
    nullable: true,
    description: 'Updated category ID to which this FAQ belongs.',
  })
  categoryId?: string;
}
