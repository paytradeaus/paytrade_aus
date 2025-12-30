import { Field, ObjectType } from '@nestjs/graphql';
import { answersCommentStatus } from 'src/entities/cmty-answers-comments.entity';
import {
  cmtyType,
  discIdeaStatus,
} from 'src/entities/cmty-discussion-idea.entity';
import { answerComment, likeVoteFlag } from './answer-comment.response';

@ObjectType({ description: 'Represents a category of a discussion idea.' })
class DiscIdeaCategoryDto {
  @Field({ nullable: true, description: 'Unique ID of the category.' })
  id?: string;

  @Field({ nullable: true, description: 'Name or value of the category.' })
  value?: string;

  // Add other category fields if needed
}

@ObjectType({
  description:
    'Represents an author or admin author of a discussion idea or comment.',
})
export class disc_idea_authorDto {
  @Field({ description: 'User ID of the author.' })
  id: string;

  @Field({ description: 'First name of the author.' })
  first_name: string;

  @Field({ description: 'Last name of the author.' })
  last_name: string;

  @Field({ description: 'Email ID of the author.' })
  email_id: string;

  @Field({ nullable: true, description: 'Base64-encoded image of the author.' })
  author_image_base64?: string;
}

@ObjectType({
  description: 'Represents an attachment in a discussion comment or idea.',
})
export class cmty_attachmentDto {
  @Field({ nullable: true, description: 'Attachment ID.' })
  id?: string;

  @Field({ nullable: true, description: 'Name of the attached file.' })
  file_name?: string;

  @Field({ nullable: true, description: 'Type of the attached file.' })
  file_type?: string;

  @Field({
    nullable: true,
    description: 'Type of attachment, e.g., comment or idea attachment.',
  })
  attachment_type?: string;

  @Field({ nullable: true, description: 'File path or URL of the attachment.' })
  file_path?: string;
}

@ObjectType({ description: 'Paginated list of answer comments.' })
export class listAnsComments {
  @Field(() => [answerComment], {
    nullable: true,
    description: 'List of answer comments.',
  })
  comment?: answerComment[];

  @Field({ nullable: true, description: 'Total number of comments.' })
  total_count?: number;
}

@ObjectType({ description: 'Represents a discussion idea with all details.' })
export class discussionIdea {
  @Field({ description: 'Unique ID of the discussion idea.' })
  id: string;

  @Field({
    nullable: true,
    description: 'Optional numeric ID for internal use.',
  })
  discussion_idea_id?: number;

  @Field({ description: 'Title of the discussion idea.' })
  title: string;

  @Field({ description: 'Content of the discussion idea.' })
  content: string;

  @Field(() => disc_idea_authorDto, {
    nullable: true,
    description: 'Author of the discussion idea.',
  })
  author?: disc_idea_authorDto;

  @Field(() => disc_idea_authorDto, {
    nullable: true,
    description: 'Admin author, if any.',
  })
  admin_author?: disc_idea_authorDto;

  @Field({ description: 'Type of community content.' })
  cmty_content_type: cmtyType;

  @Field({
    nullable: true,
    description: 'Indicates if the idea is editable by the current user.',
  })
  editable?: boolean;

  @Field({
    nullable: true,
    description: 'Indicates if comments are enabled for this idea.',
  })
  enable_comments?: boolean;

  @Field(() => DiscIdeaCategoryDto, {
    nullable: true,
    description: 'Category of the discussion idea.',
  })
  category?: DiscIdeaCategoryDto;

  @Field({ nullable: true, description: 'Status of the discussion idea.' })
  discussion_idea_status?: discIdeaStatus;

  @Field({ nullable: true, description: 'Number of votes received.' })
  vote_count?: number;

  @Field({ nullable: true, description: 'Number of likes received.' })
  like_count?: number;

  @Field({ nullable: true, description: 'Number of views.' })
  view_count?: number;

  @Field({ nullable: true, description: 'Number of flags received.' })
  flag_count?: number;

  @Field({
    nullable: true,
    description: 'Response of the current user for this idea.',
  })
  your_disc_idea_response?: string;

  @Field({ nullable: true, description: 'Creation timestamp.' })
  created_on?: Date;

  @Field({ nullable: true, description: 'Last edit timestamp.' })
  edited_on?: Date;

  @Field(() => [cmty_attachmentDto], {
    nullable: true,
    description: 'Attachments associated with the idea.',
  })
  discussion_idea_attachment?: cmty_attachmentDto[];

  @Field({ nullable: true, description: 'Count of answer comments.' })
  answer_comment_count?: number;

  @Field({
    nullable: true,
    description: 'Reason for flagging this discussion idea, if any.',
  })
  flag_reason_discussion?: string;

  @Field(() => [likeVoteFlag], {
    nullable: true,
    description: 'Votes, likes, and flags for this idea.',
  })
  vote_like_flag?: likeVoteFlag[];

  @Field(() => [answerComment], {
    nullable: true,
    description: 'Answer comments associated with this idea.',
  })
  answerComment?: answerComment[];
}

@ObjectType({ description: 'Short version of a discussion idea for lists.' })
export class discussionIdeaShort {
  @Field({ description: 'Unique ID of the discussion idea.' })
  id: string;

  @Field({
    nullable: true,
    description: 'Optional numeric ID for internal use.',
  })
  discussion_idea_id?: number;

  @Field({ description: 'Title of the discussion idea.' })
  title: string;

  @Field({ description: 'Content of the discussion idea.' })
  content: string;

  @Field({ description: 'Type of community content.' })
  cmty_content_type: cmtyType;

  @Field(() => DiscIdeaCategoryDto, {
    nullable: true,
    description: 'Category of the discussion idea.',
  })
  category?: DiscIdeaCategoryDto;

  @Field({ nullable: true, description: 'Number of likes received.' })
  like_count?: number;

  @Field({ nullable: true, description: 'Number of votes received.' })
  vote_count?: number;

  @Field({ nullable: true, description: 'Number of views.' })
  view_count?: number;

  @Field({ nullable: true, description: 'Number of answer comments.' })
  answer_comment_count?: number;

  @Field(() => disc_idea_authorDto, {
    nullable: true,
    description: 'Author of the discussion idea.',
  })
  author?: disc_idea_authorDto;

  @Field({ nullable: true, description: 'Creation timestamp.' })
  created_on?: Date;
}

// Responses
@ObjectType({ description: 'Response for a single discussion idea.' })
export class discussionIdeaResponse {
  @Field({ description: 'Status of the request.' })
  status: string;

  @Field({ description: 'Message describing the result.' })
  message: string;

  @Field(() => discussionIdea, {
    nullable: true,
    description: 'Discussion idea data.',
  })
  data?: discussionIdea;
}

@ObjectType({ description: 'Response for a list of answer comments.' })
export class listAnsCommentsResponse {
  @Field({ description: 'Status of the request.' })
  status: string;

  @Field({ description: 'Message describing the result.' })
  message: string;

  @Field(() => listAnsComments, {
    nullable: true,
    description: 'Answer comments data.',
  })
  data?: listAnsComments;
}

@ObjectType({
  description: 'Response for a short discussion idea, typically for lists.',
})
export class discussionIdeaShortResponse {
  @Field({ description: 'Status of the request.' })
  status: string;

  @Field({ description: 'Message describing the result.' })
  message: string;

  @Field(() => discussionIdeaShort, {
    nullable: true,
    description: 'Short discussion idea data.',
  })
  data?: discussionIdeaShort;
}

@ObjectType({
  description: 'Response with only status and message, used for text updates.',
})
export class discussionIdeaTextResponse {
  @Field({ description: 'Status of the request.' })
  status: string;

  @Field({ description: 'Message describing the result.' })
  message: string;
}
