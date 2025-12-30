import { ObjectType, Field, Int } from '@nestjs/graphql';
import { authorDto, ptBlogResource } from './blog-resource.response';

@ObjectType({ description: 'List of blog resources with pagination details.' })
export class ptBlogResourceList {
  @Field(() => [ptBlogResource], { description: 'Array of blog resources.' })
  blogResources: ptBlogResource[];

  @Field(() => Int, { description: 'Total number of blog resources.' })
  totalCount: number;
}

@ObjectType({ description: 'Blog resources grouped by a specific category.' })
export class ptBlogResourceCategoryWise {
  @Field({ description: 'Name of the blog resource category.' })
  category: string;

  @Field(() => [ptBlogResource], {
    description: 'Array of blog resources under this category.',
  })
  blogResources: ptBlogResource[];
}

@ObjectType({ description: 'List of blog resources grouped by categories.' })
export class ptBlogResourceCategoryWiseList {
  @Field(() => [ptBlogResourceCategoryWise], {
    description: 'Array of category-wise blog resources.',
  })
  blogResources: ptBlogResourceCategoryWise[];

  @Field(() => Int, {
    description: 'Total number of categories with blog resources.',
  })
  totalCount: number;
}

@ObjectType({ description: 'List of authors for blog resources.' })
export class ptBlogResAuthorsList {
  @Field(() => [authorDto], {
    description: 'Array of authors for blog resources.',
  })
  blogResAuthors: authorDto[];

  @Field(() => Int, { description: 'Total number of authors.' })
  totalCount: number;
}

@ObjectType({ description: 'Response object for list of blog resources.' })
export class ptBlogResourceListResponse {
  @Field({ description: 'Response status (e.g., SUCCESS, FAILED).' })
  status: string;

  @Field({ description: 'Response message providing additional context.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing blog resources and pagination info.',
  })
  data?: ptBlogResourceList;
}

@ObjectType({
  description: 'Response object for list of blog resource authors.',
})
export class ptBlogResAuthorsListResponse {
  @Field({ description: 'Response status (e.g., SUCCESS, FAILED).' })
  status: string;

  @Field({ description: 'Response message providing additional context.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing authors list and total count.',
  })
  data?: ptBlogResAuthorsList;
}

@ObjectType({
  description: 'Response object for blog resources grouped by categories.',
})
export class ptBlogResourceCategoryWiseListResponse {
  @Field({ description: 'Response status (e.g., SUCCESS, FAILED).' })
  status: string;

  @Field({ description: 'Response message providing additional context.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing category-wise blog resources and counts.',
  })
  data?: ptBlogResourceCategoryWiseList;
}
