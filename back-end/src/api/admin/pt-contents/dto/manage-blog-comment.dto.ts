import { InputType, Field } from '@nestjs/graphql';
import { commentStatus } from 'src/entities/admin-blog-comments.entity';

@InputType({ description: 'Input to manage (approve/reject) a blog comment' })
export class ManageBlogCommentInput {
  @Field({ description: 'ID of the comment to be managed' })
  commentId: string;

  @Field({
    description: 'New status for the comment',
    // Use enum values like APPROVED, REJECTED if commentStatus is an enum
  })
  comment_status: commentStatus;
}
