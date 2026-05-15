import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
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

@ObjectType({ description: 'A single message in an AI assistant chat thread.' })
export class AiChatMessage {
  @Field(() => ID, { description: 'Stable id for the message (uuid).' })
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

  @Field({
    nullable: true,
    description:
      'For assistant messages with a non-success status: a short, human-friendly reason for the failure (e.g. "Daily AI quota reached", "Upstream timeout — try again shortly").',
  })
  errorReason?: string;

  @Field(() => AiChatPageContext, {
    nullable: true,
    description:
      'For user messages: the page-context hint that was active for this turn (route, entity, ids).',
  })
  pageContext?: AiChatPageContext;
}

@ObjectType({ description: 'Summary of an AI chat thread for the picker list.' })
export class AiChatThreadSummary {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field(() => Int)
  messageCount: number;

  @Field({ nullable: true, description: 'ISO-8601 UTC timestamp of the most recent message.' })
  lastMessageAt?: string;

  @Field({ description: 'ISO-8601 UTC timestamp the thread was created.' })
  createdAt: string;
}

@ObjectType({ description: 'Wrapper for AI chat send/load responses (single thread).' })
export class AiChatResponse {
  @Field()
  status: string;

  @Field({ nullable: true })
  message?: string;

  @Field(() => ID, { nullable: true, description: 'Thread the messages belong to.' })
  threadId?: string;

  @Field({ nullable: true, description: 'Current thread title (after auto-titling, if any).' })
  threadTitle?: string;

  @Field(() => [AiChatMessage], { nullable: true })
  history?: AiChatMessage[];

  @Field(() => Int, { nullable: true })
  remainingQuota?: number;
}

@ObjectType({ description: 'Wrapper for the list-threads query.' })
export class AiChatThreadListResponse {
  @Field()
  status: string;

  @Field({ nullable: true })
  message?: string;

  @Field(() => [AiChatThreadSummary], { nullable: true })
  threads?: AiChatThreadSummary[];
}

@ObjectType({ description: 'Wrapper for thread mutations that return a thread summary.' })
export class AiChatThreadMutationResponse {
  @Field()
  status: string;

  @Field({ nullable: true })
  message?: string;

  @Field(() => AiChatThreadSummary, { nullable: true })
  thread?: AiChatThreadSummary;
}
