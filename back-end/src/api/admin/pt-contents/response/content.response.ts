import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLString } from 'graphql';

@ObjectType({ description: 'Represents a content item for a page.' })
export class ptContent {
  @Field({ description: 'Unique identifier of the content.' })
  id: string;

  @Field({
    nullable: true,
    description: 'Type of page where the content appears.',
  })
  pageType: string;

  @Field({ description: 'Heading or title of the content.' })
  heading: string;

  @Field(() => GraphQLString, { description: 'Main body text of the content.' })
  body: string;

  @Field({ description: 'Indicates whether the content is active or not.' })
  status: boolean;

  @Field({
    description: 'Timestamp indicating when the record was last updated.',
  })
  updated_on: Date;
}

@ObjectType({ description: 'Response object for a single content item.' })
export class ptContentResponse {
  @Field({ description: 'Response status (e.g., SUCCESS, FAILED).' })
  status: string;

  @Field({ description: 'Response message providing additional context.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing the content item details.',
  })
  data?: ptContent;
}
