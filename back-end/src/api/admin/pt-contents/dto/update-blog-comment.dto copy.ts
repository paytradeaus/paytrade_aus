import { InputType, Field } from '@nestjs/graphql';
import { GraphQLString } from 'graphql';
import { commentStatus } from 'src/entities/admin-blog-comments.entity';

@InputType({
  description: 'Input to update the status or details of a blog comment',
})
export class UpdateBlogCommentInput {
  @Field({ description: 'ID of the blog to which the comment belongs' })
  blogId: string;

  @Field({
    description: 'New status for the comment (e.g., APPROVED, REJECTED)',
  })
  comment_status: commentStatus;

  @Field({
    nullable: true,
    description: 'Optional date when the comment was posted',
  })
  posted_on?: Date;
}
