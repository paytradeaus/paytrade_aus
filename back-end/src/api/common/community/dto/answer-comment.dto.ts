import { InputType, Field } from '@nestjs/graphql';
import { GraphQLString } from 'graphql';
import { answersCommentStatus } from 'src/entities/cmty-answers-comments.entity';
import {
  cmtyType,
  discIdeaStatus,
} from 'src/entities/cmty-discussion-idea.entity';

@InputType({
  description:
    'Input type for adding a comment to an answer in a discussion idea.',
})
export class AddAnswerCommentInput {
  @Field({
    description: 'ID of the discussion idea the comment is associated with.',
  })
  discussion_idea_id: number;

  @Field(() => GraphQLString, {
    description: 'Text content of the answer comment.',
  })
  answer_comment: string;
}

@InputType({
  description: 'Input type for updating an existing answer comment.',
})
export class UpdateAnswerCommentInput {
  @Field({ description: 'ID of the answer comment to update.' })
  answer_comment_id: number;

  @Field(() => GraphQLString, {
    nullable: true,
    description: 'Updated text for the answer comment.',
  })
  answer_comment?: string;

  @Field({
    nullable: true,
    description: 'Updated status of the answer comment.',
  })
  answer_comment_status?: answersCommentStatus;
}
