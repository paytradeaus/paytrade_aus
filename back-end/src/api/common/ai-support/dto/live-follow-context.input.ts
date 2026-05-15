import { Field, InputType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@InputType()
export class RecordAiLiveFollowContextInput {
  @Field({ description: 'Pathname the user is currently viewing (e.g. /user/projects/123).' })
  route: string;

  @Field({ nullable: true, description: 'Optional human-readable label for the page (e.g. "Projects · 123").' })
  pageLabel?: string;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description:
      'Map of visible entity IDs extracted from the URL or page (e.g. { projectId: "123" }). Values are strings.',
  })
  entityIds?: Record<string, string>;

  @Field({
    nullable: true,
    description:
      'Optional one-line human summary of what is on screen (e.g. "Project: Acme Tower, status: Active"). Reported by pages via useReportAiContext.',
  })
  summary?: string;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description:
      'Optional map of human-readable facts about the page contents (e.g. { project: "Acme Tower", status: "Active" }). Reported by pages via useReportAiContext.',
  })
  facts?: Record<string, string>;
}
