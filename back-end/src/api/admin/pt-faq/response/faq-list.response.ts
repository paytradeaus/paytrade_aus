import { ObjectType, Field, Int } from '@nestjs/graphql';
import { ptFaQ } from './faq.response';

@ObjectType({
  description: 'Represents a list of FAQs along with total counts.',
})
export class ptFaQList {
  @Field(() => [ptFaQ], { description: 'Array of FAQ entries.' })
  FAQs: ptFaQ[];

  @Field(() => Int, { description: 'Total number of FAQ entries.' })
  totalCount: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Number of FAQs set to be shown on the home page.',
  })
  showInHomeCount: number;
}

@ObjectType({ description: 'Response object for fetching FAQ lists.' })
export class ptFaQListResponse {
  @Field({ description: 'Status of the response, e.g., SUCCESS or FAILED.' })
  status: string;

  @Field({
    description: 'Message providing additional information about the response.',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing the list of FAQs and associated counts.',
  })
  data?: ptFaQList;
}
