import { Field, ObjectType, Int } from '@nestjs/graphql';

@ObjectType()
export class SeoKeywordType {
  @Field({ nullable: true })
  id?: string;

  @Field({ nullable: true })
  keyword?: string;

  @Field({ nullable: true })
  slug?: string;

  @Field({ nullable: true })
  page_title?: string;

  @Field({ nullable: true })
  meta_description?: string;

  @Field({ nullable: true })
  page_content?: string;

  @Field({ nullable: true })
  hero_image_url?: string;

  @Field({ nullable: true })
  redirect_url?: string;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field({ nullable: true })
  status?: string;

  @Field({ nullable: true })
  created_on?: Date;

  @Field({ nullable: true })
  updated_on?: Date;
}

@ObjectType()
export class SeoKeywordResponse {
  @Field({ nullable: true })
  status?: string;

  @Field({ nullable: true })
  message?: string;

  @Field(() => SeoKeywordType, { nullable: true })
  data?: SeoKeywordType;
}

@ObjectType()
export class SeoKeywordListResponse {
  @Field({ nullable: true })
  status?: string;

  @Field({ nullable: true })
  message?: string;

  @Field(() => [SeoKeywordType], { nullable: true })
  seoKeywords?: SeoKeywordType[];

  @Field(() => Int, { nullable: true })
  totalCount?: number;
}

@ObjectType()
export class SeoKeywordDeleteResponse {
  @Field({ nullable: true })
  status?: string;

  @Field({ nullable: true })
  message?: string;
}
