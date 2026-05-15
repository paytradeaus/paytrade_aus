import { Field, Int, InputType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@InputType({
  description:
    'Structured page-context hint sent with each AI chat message so the assistant knows what the user is currently viewing.',
})
export class AiChatPageContextInput {
  @Field({
    nullable: true,
    description: 'Path/route the user is currently on (e.g. "/projects/123/claims/456").',
  })
  route?: string;

  @Field({
    nullable: true,
    description: 'Human-friendly label of the page (e.g. "projects / 123 / claims / 456").',
  })
  pageLabel?: string;

  @Field({
    nullable: true,
    description:
      'Primary entity type the user is viewing (e.g. "claim", "contract", "invoice").',
  })
  entity?: string;

  @Field({
    nullable: true,
    description: 'Primary entity id (string for safe transport of numeric or uuid ids).',
  })
  entityId?: string;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description:
      'Map of all visible record ids derived from the URL, e.g. { projectId: "12", claimId: "45" }.',
  })
  entityIds?: Record<string, string>;

  @Field(() => Int, {
    nullable: true,
    description: 'The company id the user currently has selected in the workspace.',
  })
  companyId?: number;
}

@InputType()
export class SendAiChatMessageInput {
  @Field({ description: 'User message to send to the AI assistant.' })
  message: string;

  @Field(() => AiChatPageContextInput, {
    nullable: true,
    description: 'Optional structured page-context hint for the assistant.',
  })
  pageContext?: AiChatPageContextInput;
}
