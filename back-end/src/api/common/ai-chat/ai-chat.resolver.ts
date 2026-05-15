import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { AiChatService } from './ai-chat.service';
import { SendAiChatMessageInput } from './dto/ai-chat.dto';
import { AiChatResponse } from './response/ai-chat.response';

@Resolver()
export class AiChatResolver {
  private logger = new PaytradeLogger('AI_CHAT_RESOLVER');

  constructor(
    private readonly aiChatService: AiChatService,
    private readonly jwtInternalService: JwtInternalService,
  ) {}

  private async resolveUserId(context: any): Promise<number | null> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      return decoded?.userId || null;
    } catch {
      return null;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => AiChatResponse, {
    name: 'getAiChatHistory',
    description: 'Return the persisted AI assistant chat history for the current user.',
  })
  async getAiChatHistory(@Context() context: any): Promise<AiChatResponse> {
    const userId = await this.resolveUserId(context);
    if (!userId) {
      return { status: 'ERROR', message: 'Please log in.', history: [] };
    }
    try {
      const history = await this.aiChatService.getHistory(userId);
      return { status: 'SUCCESS', history };
    } catch (err: any) {
      this.logger.error(`getAiChatHistory error: ${err?.message}`);
      return { status: 'ERROR', message: 'Unable to load chat history.', history: [] };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => AiChatResponse, {
    name: 'sendAiChatMessage',
    description: 'Send a message to the AI assistant and persist the exchange to the user history.',
  })
  async sendAiChatMessage(
    @Args('input') input: SendAiChatMessageInput,
    @Context() context: any,
  ): Promise<AiChatResponse> {
    const userId = await this.resolveUserId(context);
    if (!userId) {
      return { status: 'ERROR', message: 'Please log in.', history: [] };
    }
    try {
      const result = await this.aiChatService.sendMessage(
        userId,
        input.message,
        input.pageContext,
      );
      return {
        status: result.status,
        message: result.message,
        history: result.history,
        remainingQuota: result.remainingQuota,
      };
    } catch (err: any) {
      this.logger.error(`sendAiChatMessage error: ${err?.message}`);
      return {
        status: 'ERROR',
        message: 'Something went wrong. Please try again later.',
        history: [],
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => AiChatResponse, {
    name: 'clearAiChatHistory',
    description: 'Clear the persisted AI chat history for the current user.',
  })
  async clearAiChatHistory(@Context() context: any): Promise<AiChatResponse> {
    const userId = await this.resolveUserId(context);
    if (!userId) {
      return { status: 'ERROR', message: 'Please log in.', history: [] };
    }
    try {
      const history = await this.aiChatService.clearHistory(userId);
      return { status: 'SUCCESS', history };
    } catch (err: any) {
      this.logger.error(`clearAiChatHistory error: ${err?.message}`);
      return { status: 'ERROR', message: 'Unable to clear chat history.', history: [] };
    }
  }
}
