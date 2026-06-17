import { Field, ObjectType } from '@nestjs/graphql';
import { SeoKeywordType } from './seo-keyword.response';

@ObjectType()
export class RelatedContentItem {
  @Field({ nullable: true, description: "'community' or 'guide'" })
  type?: string;

  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true, description: 'Plain-text excerpt of the content' })
  excerpt?: string;

  @Field({ nullable: true, description: 'Reachable public URL for the item' })
  url?: string;

  @Field({ nullable: true })
  category?: string;

  @Field({ nullable: true, description: 'Short meta line, e.g. "4 replies"' })
  meta?: string;
}

@ObjectType()
export class SeoKeywordPageResponse {
  @Field({ nullable: true })
  status?: string;

  @Field({ nullable: true })
  message?: string;

  @Field(() => SeoKeywordType, { nullable: true })
  data?: SeoKeywordType;

  @Field(() => [RelatedContentItem], { nullable: true })
  community?: RelatedContentItem[];

  @Field(() => [RelatedContentItem], { nullable: true })
  guides?: RelatedContentItem[];
}

@ObjectType()
export class SeoDraftResponse {
  @Field({ nullable: true })
  status?: string;

  @Field({ nullable: true })
  message?: string;

  @Field({ nullable: true, description: 'Generated HTML draft for page_content' })
  draft?: string;
}

@ObjectType()
export class SeoBulkDraftResultItem {
  @Field({ nullable: true })
  id?: string;

  @Field({ nullable: true })
  keyword?: string;

  @Field({ nullable: true, description: "'SUCCESS' or 'ERROR'" })
  status?: string;

  @Field({ nullable: true })
  message?: string;
}

@ObjectType()
export class SeoBulkDraftResponse {
  @Field({ nullable: true })
  status?: string;

  @Field({ nullable: true })
  message?: string;

  @Field({ nullable: true, description: 'Total keywords processed' })
  total?: number;

  @Field({ nullable: true, description: 'Number of keywords successfully regenerated' })
  succeeded?: number;

  @Field({ nullable: true, description: 'Number of keywords that failed' })
  failed?: number;

  @Field(() => [SeoBulkDraftResultItem], { nullable: true })
  results?: SeoBulkDraftResultItem[];
}
