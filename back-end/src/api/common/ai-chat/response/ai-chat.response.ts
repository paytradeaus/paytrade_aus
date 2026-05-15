import { Field, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType({
  description:
    'Snapshot of the page-context hint that was active when an AI chat message was sent.',
})
export class AiChatPageContext {
  @Field({ nullable: true })
  route?: string;

  @Field({ nullable: true })
  pageLabel?: string;

  @Field({ nullable: true })
  entity?: string;

  @Field({ nullable: true })
  entityId?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  entityIds?: Record<string, string>;

  @Field(() => Int, { nullable: true })
  companyId?: number;
}

@ObjectType({ description: 'A single message in the AI assistant chat thread.' })
export class AiChatMessage {
  @Field({ description: 'Stable id for the message (uuid).' })
  id: string;

  @Field({ description: '"user" or "assistant".' })
  role: string;

  @Field({ description: 'Message text.' })
  content: string;

  @Field({ description: 'ISO-8601 UTC timestamp.' })
  ts: string;

  @Field({
    nullable: true,
    description:
      'For assistant messages: optional status (e.g. SUCCESS, OFF_TOPIC, RATE_LIMITED, ERROR).',
  })
  status?: string;

  @Field(() => AiChatPageContext, {
    nullable: true,
    description:
      'For user messages: the page-context hint that was active for this turn (route, entity, ids).',
  })
  pageContext?: AiChatPageContext;
}

@ObjectType({ description: 'Standard wrapper for AI chat responses.' })
export class AiChatResponse {
  @Field()
  status: string;

  @Field({ nullable: true })
  message?: string;

  @Field(() => [AiChatMessage], { nullable: true })
  history?: AiChatMessage[];

  @Field(() => Int, { nullable: true })
  remainingQuota?: number;
}
