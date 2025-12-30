import { ObjectType, Field, Int } from '@nestjs/graphql';
import { ptContent } from './content.response';

@ObjectType({ description: 'Represents a list of content items.' })
export class ptContentList {
  @Field(() => [ptContent], { description: 'Array of content items.' })
  Contents: ptContent[];

  @Field(() => Int, { description: 'Total number of content items.' })
  totalCount: number;
}

@ObjectType({
  description: 'Represents content organized into sections for a page.',
})
export class ptPageContents {
  @Field(() => [ptContent], {
    nullable: true,
    description: 'Content items in section 1.',
  })
  section_1?: ptContent[];

  @Field(() => [ptContent], {
    nullable: true,
    description: 'Content items in section 2.',
  })
  section_2?: ptContent[];

  @Field(() => [ptContent], {
    nullable: true,
    description: 'Content items in section 3.',
  })
  section_3?: ptContent[];

  @Field(() => [ptContent], {
    nullable: true,
    description: 'Content items in section 4.',
  })
  section_4?: ptContent[];

  @Field(() => [ptContent], {
    nullable: true,
    description: 'Content items in section 5.',
  })
  section_5?: ptContent[];
}

@ObjectType({
  description: 'Response object for fetching a list of content items.',
})
export class ptContentListResponse {
  @Field({ description: 'Response status (e.g., SUCCESS, FAILED).' })
  status: string;

  @Field({ description: 'Response message providing additional context.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing the list of content items.',
  })
  data?: ptContentList;
}

@ObjectType({
  description:
    'Response object for fetching content items organized per page sections.',
})
export class ptContentsPerPageResponse {
  @Field({ description: 'Response status (e.g., SUCCESS, FAILED).' })
  status: string;

  @Field({ description: 'Response message providing additional context.' })
  message: string;

  @Field(() => ptPageContents, {
    nullable: true,
    description: 'Data containing content items grouped by page sections.',
  })
  data?: ptPageContents;
}
