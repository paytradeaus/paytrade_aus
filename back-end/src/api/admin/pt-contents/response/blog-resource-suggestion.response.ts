import { ObjectType, Field, Int } from '@nestjs/graphql';
import {
  ptBlogResource,
  ptBlogResourceResponse,
} from './blog-resource.response';

@ObjectType({
  description: 'Blog resource along with suggested related blog resources.',
})
export class ptBlogWithSuggestion {
  @Field(() => ptBlogResource, { description: 'The main blog resource.' })
  blogResource: ptBlogResource;

  @Field(() => [ptBlogResource], {
    nullable: true,
    description: 'Array of suggested related blog resources.',
  })
  suggestions?: ptBlogResource[];
}

@ObjectType({
  description:
    'Response object containing a blog resource with its suggestions.',
})
export class ptBlogWithSuggestionResponse {
  @Field({ description: 'Response status (e.g., SUCCESS, FAILED).' })
  status: string;

  @Field({ description: 'Response message providing additional context.' })
  message: string;

  @Field({
    nullable: true,
    description:
      'Data containing the main blog resource and optional suggestions.',
  })
  data?: ptBlogWithSuggestion;
}
