import { InputType, Field } from '@nestjs/graphql';
import { GraphQLString } from 'graphql';
import {
  cmtyType,
  discIdeaStatus,
} from 'src/entities/cmty-discussion-idea.entity';

@InputType({ description: 'Input type for adding a new discussion idea.' })
export class AddDiscussionIdeaInput {
  @Field({ description: 'Title of the discussion idea.' })
  title: string;

  @Field(() => GraphQLString, {
    description: 'Content or body of the discussion idea.',
  })
  content: string;

  @Field({ description: 'Type of the community content.' })
  cmty_content_type: cmtyType;

  @Field({
    nullable: true,
    description: 'Whether comments are enabled for this idea.',
  })
  enable_idea_comments?: boolean;

  @Field({ nullable: true, description: 'Status of the discussion idea.' })
  discussion_idea_status?: discIdeaStatus;

  @Field({
    nullable: true,
    description: 'Category ID associated with this discussion idea.',
  })
  categoryId?: string;
}

@InputType({
  description: 'Input type for updating an existing discussion idea.',
})
export class UpdateDiscussionIdeaInput {
  @Field({ description: 'ID of the discussion idea to update.' })
  id: string;

  @Field({
    nullable: true,
    description: 'Updated title of the discussion idea.',
  })
  title?: string;

  @Field(() => GraphQLString, {
    nullable: true,
    description: 'Updated content of the discussion idea.',
  })
  content?: string;

  // @Field({nullable: true})
  // enable_idea_comments?: boolean;

  @Field({
    nullable: true,
    description: 'Updated category ID for the discussion idea.',
  })
  categoryId?: string;

  @Field({
    nullable: true,
    description: 'Updated status of the discussion idea.',
  })
  discussion_idea_status?: discIdeaStatus;
}
