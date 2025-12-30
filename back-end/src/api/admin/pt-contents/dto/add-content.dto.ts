import { InputType, Field } from '@nestjs/graphql';
import { GraphQLString } from 'graphql';

@InputType({
  description: 'Input for adding content to a specific page or section',
})
export class AddContentInput {
  @Field({
    nullable: true,
    description: 'Optional page type or identifier where the content belongs',
  })
  pageType?: string;

  @Field({ description: 'Heading or title of the content' })
  heading: string;

  @Field(() => GraphQLString, { description: 'Main body/content text' })
  body: string;
}
