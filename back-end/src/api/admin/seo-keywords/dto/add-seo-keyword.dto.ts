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

  @Field({ nullable: true, description: 'Hero image URL for the landing page' })
  hero_image_url?: string;

  @Field({
    nullable: true,
    description:
      'Optional redirect target. When set, /topics/[slug] redirects to this URL instead of rendering the page.',
  })
  redirect_url?: string;

  @Field(() => [String], { nullable: true, description: 'Associated tags' })
  tags?: string[];
}
