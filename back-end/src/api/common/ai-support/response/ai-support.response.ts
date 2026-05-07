import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AiAnswerResponse {
  @Field()
  status: string;

  @Field({ nullable: true })
  answer: string;

  @Field({ nullable: true })
  message: string;

  @Field(() => Int, { nullable: true })
  remainingQuota: number;

  @Field({ nullable: true })
  communityPostId: string;

  @Field({ nullable: true })
  category?: string;

  @Field(() => [String], { nullable: true })
  suggestions?: string[];
}

@ObjectType()
export class SearchResultItem {
  @Field()
  id: string;

  @Field()
  type: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  snippet: string;

  @Field({ nullable: true })
  url: string;

  @Field({ nullable: true })
  category: string;
}

@ObjectType()
export class SearchSupportResponse {
  @Field()
  status: string;

  @Field(() => [SearchResultItem])
  results: SearchResultItem[];

  @Field(() => Int)
  totalCount: number;
}
