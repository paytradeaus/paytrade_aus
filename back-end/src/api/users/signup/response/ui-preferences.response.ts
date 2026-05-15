import { Field, ObjectType, Int } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';

@ObjectType({
  description:
    'Per-user UI shell + AI live-follow preferences returned to the frontend layout.',
})
export class UiPreferencesPayload {
  @Field({ description: 'Whether the left nav is rendered collapsed.' })
  navCollapsed: boolean;

  @Field({
    description:
      'AI messenger column state: "open" | "rail" | "hidden". On narrow viewports the frontend may force "hidden".',
  })
  aiPanelState: string;

  @Field(() => Int, {
    description: 'Saved AI messenger column width in pixels (when "open").',
  })
  aiPanelWidth: number;

  @Field({
    description:
      'Whether this user has the "Allow AI live follow" pilot setting enabled. Default false.',
  })
  aiLiveFollowEnabled: boolean;

  @Field({
    nullable: true,
    description:
      'Timestamp when the AI live-follow flag was last enabled (UTC). Used for the admin audit view.',
  })
  aiLiveFollowEnabledAt?: Date;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Free-form bag for additional UI preferences.',
  })
  extra?: Record<string, any>;
}

@ObjectType({
  description:
    'Standard response wrapper for the user UI preferences payload.',
})
export class UiPreferencesResponse {
  @Field()
  status: string;

  @Field()
  message: string;

  @Field(() => UiPreferencesPayload, { nullable: true })
  data?: UiPreferencesPayload;
}

@ObjectType({
  description:
    'A single user row for the admin "AI live follow audit" listing.',
})
export class AiLiveFollowAuditRow {
  @Field(() => Int)
  user_id: number;

  @Field()
  email_id: string;

  @Field({ nullable: true })
  first_name?: string;

  @Field({ nullable: true })
  last_name?: string;

  @Field({ nullable: true })
  ai_live_follow_enabled_at?: Date;
}

@ObjectType({
  description:
    'Standard response wrapper for the admin AI live-follow audit listing.',
})
export class AiLiveFollowAuditResponse {
  @Field()
  status: string;

  @Field()
  message: string;

  @Field(() => [AiLiveFollowAuditRow], { nullable: true })
  data?: AiLiveFollowAuditRow[];
}
