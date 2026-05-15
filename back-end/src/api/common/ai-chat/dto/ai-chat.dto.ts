import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class SendAiChatMessageInput {
  @Field({ description: 'User message to send to the AI assistant.' })
  message: string;
}
