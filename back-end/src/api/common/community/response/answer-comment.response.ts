import { Field, ObjectType } from '@nestjs/graphql';
import { answersCommentStatus } from 'src/entities/cmty-answers-comments.entity';
import {
  cmty_attachmentDto,
  disc_idea_authorDto,
  listAnsComments,
} from './discussion-idea.response';
import {
  flagType,
  reactionType,
} from 'src/entities/cmty-vote-likes-flags.entity';

@ObjectType({
  description: 'Represents a comment on an answer in the community.',
})
export class answerComment {
  @Field({ nullable: true, description: 'Unique ID of the comment record.' })
  id?: string;

  @Field({ nullable: true, description: 'ID of the answer comment.' })
  answer_comment_id?: number;

  @Field({ nullable: true, description: 'Text content of the answer comment.' })
  answer_comment?: string;

  @Field({
    nullable: true,
    description: 'Total number of likes on this comment.',
  })
  like_count?: number;

  @Field({
    nullable: true,
    description: 'Total number of flags on this comment.',
  })
  flag_count?: number;

  @Field({
    nullable: true,
    description: 'The reaction given by the current user.',
  })
  your_response?: string;

  @Field({ nullable: true, description: 'Reason for flagging, if applicable.' })
  flag_reason?: string;

  @Field({
    nullable: true,
    description: 'Indicates if the comment can be edited by the user.',
  })
  comment_editable?: boolean;

  @Field({ nullable: true, description: 'Status of the answer comment.' })
  answer_comment_status?: answersCommentStatus;

  @Field({
    nullable: true,
    description: 'ID of the user who made the comment.',
  })
  answer_comment_by?: string;

  @Field({ nullable: true, description: 'Name of the comment owner.' })
  answer_comment_owner_name?: string;

  @Field({
    nullable: true,
    description: 'Base64-encoded image of the comment owner.',
  })
  answer_comment_owner_image_base64?: string;

  @Field({
    nullable: true,
    description: 'Timestamp when the comment was created.',
  })
  created_on?: Date;

  @Field(() => [cmty_attachmentDto], {
    nullable: true,
    description: 'Attachments associated with the comment.',
  })
  answer_comment_attachment?: cmty_attachmentDto[];

  // Uncomment if you want to include all likes/votes/flags as nested objects
  // @Field(() => [likeVoteFlag], { nullable: true })
  // vote_like_flag?: likeVoteFlag[];
}

@ObjectType({
  description: 'Represents a like, vote, or flag on an answer comment.',
})
export class likeVoteFlag {
  @Field({ nullable: true, description: 'Unique ID of the reaction record.' })
  id?: string;

  @Field({
    nullable: true,
    description: 'Type of reaction, e.g., like or dislike.',
  })
  reaction_type?: reactionType;

  @Field({
    nullable: true,
    description: 'Type of flag if the content was flagged.',
  })
  cmty_flag_type?: flagType;

  @Field({ nullable: true, description: 'Reason for the flag.' })
  flag_reason?: string;

  @Field({
    nullable: true,
    description: 'Title associated with the reaction or comment.',
  })
  title?: string;

  @Field({
    nullable: true,
    description: 'Text of the answer comment this reaction applies to.',
  })
  answer_comment?: string;

  @Field({
    nullable: true,
    description: 'Timestamp when this reaction was created.',
  })
  created_on?: Date;

  @Field(() => disc_idea_authorDto, {
    nullable: true,
    description: 'Details of the user who liked or flagged.',
  })
  voter_liked_flagged?: disc_idea_authorDto;

  @Field(() => disc_idea_authorDto, {
    nullable: true,
    description: 'Details of the admin who liked or flagged.',
  })
  admin_voter_liked_flagged?: disc_idea_authorDto;
}

@ObjectType({ description: 'Response object for an answer comment query.' })
export class answerCommentResponse {
  @Field({ description: 'Response status, e.g., SUCCESS or FAILED.' })
  status: string;

  @Field({ description: 'Response message describing the result.' })
  message: string;

  @Field(() => answerComment, {
    nullable: true,
    description: 'Data of the answer comment.',
  })
  data?: answerComment;
}
