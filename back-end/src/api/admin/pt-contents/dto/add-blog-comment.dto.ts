import { InputType, Field } from '@nestjs/graphql';
import { GraphQLString } from 'graphql';

@InputType({ description: 'Input for adding a comment to a blog post' })
export class AddBlogCommentInput {
  @Field({
    description: 'ID of the blog post to which the comment will be added',
  })
  blogId: string;

  @Field(() => GraphQLString, { description: 'Content of the comment' })
  comment: string;
}
