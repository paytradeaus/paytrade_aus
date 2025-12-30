import { InputType, Field } from '@nestjs/graphql';
import { answersCommentStatus } from 'src/entities/cmty-answers-comments.entity';
import {
  cmtyType,
  discIdeaStatus,
} from 'src/entities/cmty-discussion-idea.entity';

@InputType({
  description:
    'Input type to list discussion ideas with optional filters and pagination.',
})
export class ListDiscussionIdeaInput {
  @Field({
    nullable: true,
    description: 'Keyword to search within discussion ideas.',
  })
  keyword?: string;

  @Field({ nullable: true, description: 'Filter by community content type.' })
  cmtyContentType?: cmtyType;

  @Field({ nullable: true, description: 'Filter by category ID.' })
  category?: string;

  @Field({ nullable: true, description: 'Filter by author ID or name.' })
  author?: string;

  @Field({ nullable: true, description: 'Whether to filter only top content.' })
  top_content?: boolean;

  @Field({
    nullable: true,
    description: 'Whether to filter only answered ideas.',
  })
  is_answered?: boolean;

  @Field({ nullable: true, description: 'Sort mode for the results.' })
  sort_mode?: string;

  @Field({ nullable: true, description: 'Filter by discussion idea status.' })
  discussion_idea_status?: discIdeaStatus;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Page number for pagination.',
  })
  page?: number;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Number of items per page.',
  })
  perPage?: number;

  @Field({
    nullable: true,
    description: 'Date filter type (e.g., created_on, updated_on).',
  })
  date_filter?: string;

  @Field({ nullable: true, description: 'Start date for date filter.' })
  start_date?: Date;

  @Field({ nullable: true, description: 'End date for date filter.' })
  end_date?: Date;

  @Field({ nullable: true, description: 'Field to sort the results by.' })
  sorting_field?: string;

  @Field({ nullable: true, description: 'Order of sorting: ASC or DESC.' })
  sorting_order?: 'ASC' | 'DESC';
}

@InputType({
  description:
    'Input type to fetch paginated answer comments for a discussion idea.',
})
export class getAnsCommentInput {
  @Field({ description: 'ID of the discussion idea to fetch comments for.' })
  id: number;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Page number for pagination.',
  })
  page?: number;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Number of comments per page.',
  })
  perPage?: number;

  @Field({
    nullable: true,
    description: 'Filter by status of answer comments.',
  })
  status?: answersCommentStatus;

  @Field({
    nullable: true,
    description: 'Filter for best answer comments only.',
  })
  best_ans?: boolean;

  @Field({ nullable: true, description: 'Field to sort the comments by.' })
  sorting_field?: string;

  @Field({ nullable: true, description: 'Order of sorting: ASC or DESC.' })
  sorting_order?: 'ASC' | 'DESC';
}

@InputType({
  description:
    'Input type to list community flags on discussion ideas or comments.',
})
export class ListCommunityFlagsInput {
  @Field({ nullable: true, description: 'Filter by discussion idea ID.' })
  discussion_idea_id?: number;

  @Field({ nullable: true, description: 'Filter by answer comment ID.' })
  answer_comment_id?: number;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Page number for pagination.',
  })
  page?: number;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Number of items per page.',
  })
  perPage?: number;

  @Field({ nullable: true, description: 'Field to sort the results by.' })
  sorting_field?: string;

  @Field({ nullable: true, description: 'Order of sorting: ASC or DESC.' })
  sorting_order?: 'ASC' | 'DESC';
}
