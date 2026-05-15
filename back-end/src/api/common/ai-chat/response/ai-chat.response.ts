import { Field, Int, ObjectType } from '@nestjs/graphql';

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
