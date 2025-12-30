import { ObjectType, Field, Int } from '@nestjs/graphql';
import { discussionIdea } from './discussion-idea.response';
import { likeVoteFlag } from './answer-comment.response';

@ObjectType({
  description: 'Paginated list of discussion ideas with total count.',
})
export class discussionIdeaList {
  @Field(() => [discussionIdea], { description: 'List of discussion ideas.' })
  discussionIdeas: discussionIdea[];

  @Field(() => Int, {
    description: 'Total number of discussion ideas available.',
  })
  totalCount: number;
}

@ObjectType({ description: 'Paginated list of likes, votes, and flags.' })
export class likeVoteFlagList {
  @Field(() => [likeVoteFlag], {
    description: 'List of likes, votes, and flags.',
  })
  flagsList: likeVoteFlag[];

  @Field(() => Int, { description: 'Total number of likes, votes, and flags.' })
  total_count: number;
}

@ObjectType({
  description: 'Represents a single category with optional count.',
})
export class categoriesList {
  @Field({ nullable: true, description: 'ID of the category master record.' })
  master_id?: string;

  @Field({
    nullable: true,
    description: 'Name or value of the category master record.',
  })
  master_value?: string;

  @Field({
    nullable: true,
    description: 'Number of discussion ideas in this category.',
  })
  per_category_count?: number;
}

@ObjectType({ description: 'List of categories with total count.' })
export class categoriesListWithTotal {
  @Field(() => [categoriesList], {
    nullable: true,
    description: 'List of categories.',
  })
  categories?: categoriesList[];

  @Field({
    nullable: true,
    description: 'Total number of categories available.',
  })
  total_count?: number;
}

// Response objects

@ObjectType({ description: 'Response for fetching discussion ideas list.' })
export class discussionIdeaListResponse {
  @Field({ description: 'Status of the request.' })
  status: string;

  @Field({ description: 'Message describing the result.' })
  message: string;

  @Field(() => discussionIdeaList, {
    nullable: true,
    description: 'Data containing discussion ideas and total count.',
  })
  data?: discussionIdeaList;
}

@ObjectType({ description: 'Response for fetching categories list.' })
export class categoriesListResponse {
  @Field({ description: 'Status of the request.' })
  status: string;

  @Field({ description: 'Message describing the result.' })
  message: string;

  @Field(() => categoriesListWithTotal, {
    nullable: true,
    description: 'Data containing categories and total count.',
  })
  data?: categoriesListWithTotal;
}

@ObjectType({
  description: 'Response for fetching likes, votes, and flags list.',
})
export class likeVoteFlagListResponse {
  @Field({ description: 'Status of the request.' })
  status: string;

  @Field({ description: 'Message describing the result.' })
  message: string;

  @Field(() => likeVoteFlagList, {
    nullable: true,
    description: 'Data containing flags, likes, and votes.',
  })
  data?: likeVoteFlagList;
}
