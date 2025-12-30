import { InputType, Field } from '@nestjs/graphql';
import { GraphQLString } from 'graphql';
import {
  blogStatus,
  contentType,
} from '../../../../entities/admin-blogs-resources.entity';

@InputType({ description: 'Input type to update an existing blog resource' })
export class UpdateBlogResourceInput {
  @Field({ description: 'Unique ID of the blog resource to update' })
  id: string;

  @Field({ nullable: true, description: 'Updated title of the blog resource' })
  title?: string;

  @Field(() => GraphQLString, {
    nullable: true,
    description: 'Updated content/body of the blog resource',
  })
  content?: string;

  @Field({
    nullable: true,
    description: 'Updated type of content (e.g., TEXT, VIDEO, IMAGE)',
  })
  content_type?: contentType;

  @Field(() => GraphQLString, {
    nullable: true,
    description: 'Link to the video if the content type is video',
  })
  video_link?: string;

  @Field({
    nullable: true,
    description: 'Flag indicating whether comments are enabled for this blog',
  })
  enable_comments?: boolean;

  @Field({
    nullable: true,
    description: 'Updated category ID of the blog resource',
  })
  categoryId?: string;

  @Field({
    nullable: true,
    description: 'Updated status of the blog resource (e.g., DRAFT, PUBLISHED)',
  })
  blog_status?: blogStatus;

  @Field(() => [GraphQLString], {
    nullable: true,
    description: 'Updated list of tags associated with the blog resource',
  })
  tags?: string[];
}
