import { Args, Context, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { AiChatService } from './ai-chat.service';
import {
  RenameAiChatThreadInput,
  SendAiChatMessageInput,
  ThreadIdInput,
} from './dto/ai-chat.dto';
import {
  AiChatResponse,
  AiChatThreadListResponse,
  AiChatThreadMutationResponse,
} from './response/ai-chat.response';

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

  // ---------------------------------------------------------------------------
  // Thread queries
  // ---------------------------------------------------------------------------

  @UseGuards(JwtAuthGuard)
  @Query(() => AiChatThreadListResponse, {
    name: 'listAiChatThreads',
    description: 'Return the AI assistant chat threads for the current user.',
  })
  async listAiChatThreads(@Context() context: any): Promise<AiChatThreadListResponse> {
    const userId = await this.resolveUserId(context);
    if (!userId) {
      return { status: 'ERROR', message: 'Please log in.', threads: [] };
    }
    try {
      const threads = await this.aiChatService.listThreads(userId);
      return { status: 'SUCCESS', threads };
    } catch (err: any) {
      this.logger.error(`listAiChatThreads error: ${err?.message}`);
      return { status: 'ERROR', message: 'Unable to load chat list.', threads: [] };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => AiChatResponse, {
    name: 'getAiChatThread',
    description: 'Return a single AI chat thread (with messages) by id.',
  })
  async getAiChatThread(
    @Args('threadId', { type: () => ID }) threadId: string,
    @Context() context: any,
  ): Promise<AiChatResponse> {
    const userId = await this.resolveUserId(context);
    if (!userId) {
      return { status: 'ERROR', message: 'Please log in.', history: [] };
    }
    try {
      const result = await this.aiChatService.getThreadMessages(userId, threadId);
      if (!result) {
        return { status: 'ERROR', message: 'Conversation not found.', history: [] };
      }
      return {
        status: 'SUCCESS',
        threadId: result.thread.id,
        threadTitle: result.thread.title,
        history: result.messages,
      };
    } catch (err: any) {
      this.logger.error(`getAiChatThread error: ${err?.message}`);
      return { status: 'ERROR', message: 'Unable to load conversation.', history: [] };
    }
  }

  // ---------------------------------------------------------------------------
  // Thread mutations
  // ---------------------------------------------------------------------------

  @UseGuards(JwtAuthGuard)
  @Mutation(() => AiChatThreadMutationResponse, {
    name: 'createAiChatThread',
    description: 'Create a new (empty) AI assistant chat thread for the current user.',
  })
  async createAiChatThread(
    @Context() context: any,
  ): Promise<AiChatThreadMutationResponse> {
    const userId = await this.resolveUserId(context);
    if (!userId) {
      return { status: 'ERROR', message: 'Please log in.' };
    }
    try {
      const thread = await this.aiChatService.createThread(userId);
      return { status: 'SUCCESS', thread };
    } catch (err: any) {
      this.logger.error(`createAiChatThread error: ${err?.message}`);
      return { status: 'ERROR', message: 'Unable to start a new chat.' };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => AiChatThreadMutationResponse, {
    name: 'renameAiChatThread',
    description: 'Rename an existing AI chat thread.',
  })
  async renameAiChatThread(
    @Args('input') input: RenameAiChatThreadInput,
    @Context() context: any,
  ): Promise<AiChatThreadMutationResponse> {
    const userId = await this.resolveUserId(context);
    if (!userId) {
      return { status: 'ERROR', message: 'Please log in.' };
    }
    try {
      const thread = await this.aiChatService.renameThread(
        userId,
        input.threadId,
        input.title,
      );
      if (!thread) {
        return { status: 'ERROR', message: 'Conversation not found.' };
      }
      return { status: 'SUCCESS', thread };
    } catch (err: any) {
      this.logger.error(`renameAiChatThread error: ${err?.message}`);
      return { status: 'ERROR', message: 'Unable to rename conversation.' };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => AiChatThreadMutationResponse, {
    name: 'deleteAiChatThread',
    description: 'Delete an AI chat thread and all of its messages.',
  })
  async deleteAiChatThread(
    @Args('input') input: ThreadIdInput,
    @Context() context: any,
  ): Promise<AiChatThreadMutationResponse> {
    const userId = await this.resolveUserId(context);
    if (!userId) {
      return { status: 'ERROR', message: 'Please log in.' };
    }
    try {
      const ok = await this.aiChatService.deleteThread(userId, input.threadId);
      if (!ok) {
        return { status: 'ERROR', message: 'Conversation not found.' };
      }
      return { status: 'SUCCESS' };
    } catch (err: any) {
      this.logger.error(`deleteAiChatThread error: ${err?.message}`);
      return { status: 'ERROR', message: 'Unable to delete conversation.' };
    }
  }

  // ---------------------------------------------------------------------------
  // Send a message (creates a thread on the fly when threadId is omitted).
  // ---------------------------------------------------------------------------

  @UseGuards(JwtAuthGuard)
  @Mutation(() => AiChatResponse, {
    name: 'sendAiChatMessage',
    description:
      'Send a message to the AI assistant. Appends to the supplied thread, or creates a new thread when threadId is omitted.',
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
        input.threadId || null,
        input.pageContext,
      );
      return {
        status: result.status,
        message: result.message,
        threadId: result.thread?.id,
        threadTitle: result.thread?.title,
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

  // ---------------------------------------------------------------------------
  // Back-compat: legacy single-bucket queries/mutations.
  // ---------------------------------------------------------------------------

  @UseGuards(JwtAuthGuard)
  @Query(() => AiChatResponse, {
    name: 'getAiChatHistory',
    description:
      '(Deprecated) Return the most recent AI chat thread for the current user. Prefer listAiChatThreads + getAiChatThread.',
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
    name: 'clearAiChatHistory',
    description:
      '(Deprecated) Delete the most recent AI chat thread for the current user.',
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
