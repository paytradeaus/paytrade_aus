import { Field, Int, ObjectType } from '@nestjs/graphql';
import { GraphQLString } from 'graphql';
import { commentStatus } from 'src/entities/admin-blog-comments.entity';
import { blogStatus } from 'src/entities/admin-blogs-resources.entity';

@ObjectType({ description: 'Represents a blog record.' })
class blogtDto {
  @Field({ nullable: true, description: 'Unique identifier of the blog.' })
  id: string;

  @Field({ nullable: true, description: 'Title of the blog.' })
  title: string;

  @Field({
    nullable: true,
    description: 'Current status of the blog (e.g., Draft, Published).',
  })
  blog_status: blogStatus;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the blog was last updated.',
  })
  updated_on: Date;
}

@ObjectType({ description: 'Represents a comment on a blog.' })
export class ptBlogComments {
  @Field({ description: 'Unique identifier of the comment.' })
  id: string;

  @Field(() => blogtDto, {
    description: 'Details of the blog this comment belongs to.',
  })
  blog: blogtDto;

  @Field(() => GraphQLString, { description: 'Content of the comment.' })
  comment: string;

  @Field({ description: 'Status of the comment (e.g., Approved, Pending).' })
  comment_status: commentStatus;

  @Field({
    nullable: true,
    description: 'User ID of the person who made the comment.',
  })
  comment_by: number;

  @Field({ nullable: true, description: 'Name of the comment owner.' })
  comment_owner_name: string;

  @Field({
    description: 'Timestamp indicating when the comment was created.',
  })
  created_on: Date;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the comment was posted publicly.',
  })
  posted_on: Date;
}

@ObjectType({ description: 'Response object for a single blog comment.' })
export class ptBlogCommentsResponse {
  @Field({ description: 'Response status (e.g., SUCCESS, FAILED).' })
  status: string;

  @Field({ description: 'Response message.' })
  message: string;

  @Field({ nullable: true, description: 'Details of the blog comment.' })
  data?: ptBlogComments;
}

@ObjectType({ description: 'List of comments for a specific blog.' })
export class ptBlogCommentsList {
  @Field({
    nullable: true,
    description: 'Details of the blog associated with these comments.',
  })
  blogDetails: blogtDto;

  @Field(() => [ptBlogComments], { description: 'Array of blog comments.' })
  comments: ptBlogComments[];

  @Field(() => Int, { description: 'Total number of comments for the blog.' })
  totalCount: number;
}

@ObjectType({ description: 'Response object for list of blog comments.' })
export class ptBlogCommentsListResponse {
  @Field({ description: 'Response status (e.g., SUCCESS, FAILED).' })
  status: string;

  @Field({ description: 'Response message.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing the blog and its comments.',
  })
  data?: ptBlogCommentsList;
}
