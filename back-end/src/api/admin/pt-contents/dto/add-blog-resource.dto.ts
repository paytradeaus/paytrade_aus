import { InputType, Field } from '@nestjs/graphql';
import { GraphQLString } from 'graphql';
import {
  blogStatus,
  contentType,
} from '../../../../entities/admin-blogs-resources.entity';

@InputType({ description: 'Input for creating a new blog resource' })
export class AddBlogResourceInput {
  @Field({ description: 'Title of the blog resource' })
  title: string;

  @Field(() => GraphQLString, {
    description: 'Content/body of the blog resource',
  })
  content: string;

  @Field({ description: 'Type of the content (e.g., ARTICLE, VIDEO, etc.)' })
  content_type: contentType;

  @Field(() => GraphQLString, {
    nullable: true,
    description: 'Optional video link if the content type is VIDEO',
  })
  video_link?: string;

  @Field({
    description:
      'Flag indicating if comments are enabled for this blog resource',
  })
  enable_comments: boolean;

  @Field({ description: 'Status of the blog (e.g., DRAFT, PUBLISHED)' })
  blog_status: blogStatus;

  @Field({
    description: 'ID of the category under which the blog resource falls',
  })
  categoryId: string;

  @Field(() => [GraphQLString], {
    nullable: true,
    description: 'List of tags associated with the blog resource',
  })
  tags?: string[];
}
