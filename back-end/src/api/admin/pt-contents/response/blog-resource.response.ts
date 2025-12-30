import { Field, ObjectType } from '@nestjs/graphql';
import {
  blogStatus,
  contentType,
  resourceType,
} from '../../../../entities/admin-blogs-resources.entity';
import { commentStatus } from '../../../../entities/admin-blog-comments.entity';

@ObjectType({ description: 'Represents a blog category.' })
class blogCategoryDto {
  @Field({ description: 'Unique identifier for the category.' })
  id: string;

  @Field({ description: 'Display value of the category.' })
  value: string;
}

@ObjectType({ description: 'Represents an author of a blog resource.' })
export class authorDto {
  @Field({ description: 'Unique identifier for the author.' })
  id: string;

  @Field({ description: 'First name of the author.' })
  first_name: string;

  @Field({ description: 'Last name of the author.' })
  last_name: string;

  @Field({ description: 'Email ID of the author.' })
  email_id: string;
}

@ObjectType({
  description: 'Represents an attachment linked to a blog resource.',
})
class attachmentDto {
  @Field({
    nullable: true,
    description: 'Unique identifier for the attachment.',
  })
  id: string;

  @Field({
    nullable: true,
    description: 'Original file name of the attachment.',
  })
  file_name: string;

  @Field({
    nullable: true,
    description: 'Type of the file (e.g., image, pdf).',
  })
  file_type: string;

  @Field({
    nullable: true,
    description: 'Type of attachment (e.g., banner, document).',
  })
  attachment_type: string;

  @Field({
    nullable: true,
    description: 'File path or URL to access the attachment.',
  })
  file_path: string;
}

@ObjectType({ description: 'Represents a comment on a blog resource.' })
class BlogCommentDto {
  @Field({ nullable: true, description: 'Unique identifier of the comment.' })
  id: string;

  @Field({ nullable: true, description: 'Text content of the comment.' })
  comment: string;

  @Field({
    nullable: true,
    description: 'Status of the comment (e.g., APPROVED, PENDING).',
  })
  comment_status: commentStatus;

  @Field({
    nullable: true,
    description: 'User ID of the person who posted the comment.',
  })
  comment_by: string;

  @Field({ nullable: true, description: 'Full name of the comment owner.' })
  comment_owner_name: string;

  @Field({
    nullable: true,
    description:
      'Base64 string representing the comment owner’s profile image.',
  })
  comment_owner_image_base64: string;

  @Field({ nullable: true, description: 'Date when the comment was posted.' })
  posted_on: Date;
}

@ObjectType({ description: 'Represents a complete blog resource.' })
export class ptBlogResource {
  @Field({ description: 'Unique identifier of the blog resource.' })
  id: string;

  @Field({ description: 'Title of the blog resource.' })
  title: string;

  @Field({ description: 'Main content/body of the blog resource.' })
  content: string;

  @Field({
    nullable: true,
    description: 'URL-friendly slug of the blog resource.',
  })
  urlSlug: string;

  @Field(() => authorDto, {
    nullable: true,
    description: 'Author details of the blog resource.',
  })
  author: authorDto;

  @Field({ description: 'Content type of the blog resource.' })
  content_type: contentType;

  @Field({
    nullable: true,
    description: 'Optional video link associated with the blog resource.',
  })
  video_link: string;

  @Field({
    nullable: true,
    description: 'Flag to indicate if comments are enabled for this blog.',
  })
  enable_comments: boolean;

  @Field(() => blogCategoryDto, {
    nullable: true,
    description: 'Category details of the blog resource.',
  })
  category: blogCategoryDto;

  @Field({
    nullable: true,
    description: 'Status of the blog resource (e.g., PUBLISHED, DRAFT).',
  })
  blog_status: blogStatus;

  @Field({
    nullable: true,
    description: 'Total number of comments on the blog resource.',
  })
  comments_count: number;

  @Field({
    nullable: true,
    description: 'Number of pending comments for moderation.',
  })
  pending_comments_count: number;

  @Field({ nullable: true, description: 'Date when the blog was published.' })
  published_on: Date;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the blog was created.',
  })
  created_on: Date;

  @Field(() => attachmentDto, {
    nullable: true,
    description: 'Banner image or attachment of the blog resource.',
  })
  banner: attachmentDto;

  @Field(() => [String], {
    nullable: true,
    description: 'Array of tags associated with the blog resource.',
  })
  tags: string[];

  @Field(() => [BlogCommentDto], {
    nullable: true,
    description: 'List of comments for the blog resource.',
  })
  comment: BlogCommentDto[];

  @Field(() => attachmentDto, {
    nullable: true,
    description: 'Optional additional attachment for the blog resource.',
  })
  attachment: attachmentDto;
}

@ObjectType({
  description: 'Short version of the blog resource for listing purposes.',
})
export class ptBlogResourceShort {
  @Field({ description: 'Unique identifier of the blog resource.' })
  id: string;

  @Field({ description: 'Title of the blog resource.' })
  title: string;

  @Field({ description: 'Content/body of the blog resource.' })
  content: string;

  @Field({
    nullable: true,
    description: 'URL-friendly slug of the blog resource.',
  })
  urlSlug: string;

  @Field({ description: 'Content type of the blog resource.' })
  content_type: contentType;

  @Field(() => blogCategoryDto, {
    nullable: true,
    description: 'Category details of the blog resource.',
  })
  category: blogCategoryDto;

  @Field({ nullable: true, description: 'Date when the blog was published.' })
  published_on: Date;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the blog was created.',
  })
  created_on: Date;
}

@ObjectType({ description: 'Response object for fetching a blog resource.' })
export class ptBlogResourceResponse {
  @Field({ description: 'Response status (e.g., SUCCESS, FAILED).' })
  status: string;

  @Field({ description: 'Response message providing additional context.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing the detailed blog resource.',
  })
  data?: ptBlogResource;
}

@ObjectType({
  description: 'Response object for fetching a short blog resource.',
})
export class ptBlogResourceShortResponse {
  @Field({ description: 'Response status (e.g., SUCCESS, FAILED).' })
  status: string;

  @Field({ description: 'Response message providing additional context.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing the short version of the blog resource.',
  })
  data?: ptBlogResourceShort;
}

@ObjectType({ description: 'Response containing an embedded URL string.' })
export class embeddedUrlResponse {
  @Field({ description: 'Response status (e.g., SUCCESS, FAILED).' })
  status: string;

  @Field({ description: 'Response message providing additional context.' })
  message: string;

  @Field({ nullable: true, description: 'Embedded URL data as a string.' })
  data?: string;
}
