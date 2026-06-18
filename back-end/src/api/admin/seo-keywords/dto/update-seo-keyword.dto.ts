import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateSeoKeywordInput {
  @Field({ description: 'ID of the SEO keyword to update' })
  id: string;

  @Field({ nullable: true, description: 'The SEO keyword phrase' })
  keyword?: string;

  @Field({ nullable: true, description: 'URL-friendly slug for the landing page' })
  slug?: string;

  @Field({ nullable: true, description: 'Page title for SEO' })
  page_title?: string;

  @Field({ nullable: true, description: 'Meta description for SEO' })
  meta_description?: string;

  @Field({ nullable: true, description: 'HTML content for the landing page' })
  page_content?: string;

  @Field({ nullable: true, description: 'Hero image URL for the landing page' })
  hero_image_url?: string;

  @Field(() => [String], { nullable: true, description: 'Associated tags' })
  tags?: string[];

  @Field({ nullable: true, description: 'Status: Active or Inactive' })
  status?: string;
}
