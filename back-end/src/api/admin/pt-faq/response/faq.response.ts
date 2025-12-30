import { Field, ObjectType } from '@nestjs/graphql';
import { FaqStatus } from '../../../../entities/admin-faq.entity';

@ObjectType({ description: 'Represents a FAQ category.' })
class CategoryDto {
  @Field({ description: 'Unique identifier of the category.' })
  id: string;

  @Field({ description: 'Name or value of the category.' })
  value: string;

  // Include other fields you want to expose about the category
}

@ObjectType({
  description: 'Represents a Frequently Asked Question (FAQ) entry.',
})
export class ptFaQ {
  @Field({ description: 'Unique identifier of the FAQ.' })
  id: string;

  @Field({ description: 'Question text of the FAQ.' })
  question: string;

  @Field({ description: 'Answer text of the FAQ.' })
  answer: string;

  @Field({
    nullable: true,
    description: 'Indicates if this FAQ should be shown on the home page.',
  })
  show_in_home: boolean;

  @Field({
    description: 'Current status of the FAQ, e.g., Active, Inactive, Deleted.',
  })
  faq_status: FaqStatus;

  @Field(() => CategoryDto, {
    nullable: true,
    description: 'Category details associated with the FAQ.',
  })
  category: CategoryDto;
}

@ObjectType({ description: 'Response object for fetching a single FAQ.' })
export class ptFaQResponse {
  @Field({ description: 'Status of the response, e.g., SUCCESS or FAILED.' })
  status: string;

  @Field({
    description: 'Message providing additional information about the response.',
  })
  message: string;

  @Field({ nullable: true, description: 'FAQ data returned by the API.' })
  data?: ptFaQ;
}
