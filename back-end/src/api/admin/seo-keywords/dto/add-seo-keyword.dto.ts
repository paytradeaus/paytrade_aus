import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AddSeoKeywordInput {
  @Field({ description: 'The SEO keyword phrase' })
  keyword: string;

  @Field({ description: 'URL-friendly slug for the landing page' })
  slug: string;

  @Field({ description: 'Page title for SEO' })
  page_title: string;

  @Field({ description: 'Meta description for SEO' })
  meta_description: string;

  @Field({ nullable: true, description: 'HTML content for the landing page' })
  page_content?: string;

  @Field(() => [String], { nullable: true, description: 'Associated tags' })
  tags?: string[];
}
