import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { Public } from 'src/api/auth/jwt-guard/public.decorator';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { AiSupportService } from './ai-support.service';
import { AskAiSupportInput, SearchSupportInput } from './dto/ai-support.dto';
import {
  AiAnswerResponse,
  SearchSupportResponse,
} from './response/ai-support.response';

@Resolver()
export class AiSupportResolver {
  private logger = new PaytradeLogger('AI_SUPPORT_RESOLVER');

  constructor(
    private readonly aiSupportService: AiSupportService,
    private readonly jwtInternalService: JwtInternalService,
  ) {}

  @Public()
  @Query(() => SearchSupportResponse, {
    name: 'searchSupport',
    description: 'Search FAQs, how-to guides, and community discussions.',
  })
  async searchSupport(
    @Args('searchSupportInput') input: SearchSupportInput,
  ): Promise<SearchSupportResponse> {
    try {
      return await this.aiSupportService.searchSupport(
        input.query,
        input.page,
        input.perPage,
      );
    } catch (error) {
      this.logger.error(`searchSupport error: ${error.message}`);
      throw new HttpException(
        'Failed to search support content.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Mutation(() => AiAnswerResponse, {
    name: 'askAiSupport',
    description: 'Ask PayTrade AI a question. Requires authentication.',
  })
  async askAiSupport(
    @Args('askAiSupportInput') input: AskAiSupportInput,
    @Context() context: any,
  ): Promise<AiAnswerResponse> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      if (!decoded || !decoded.userId) {
        return {
          status: 'ERROR',
          answer: null,
          message: 'Please log in to use the AI assistant.',
          remainingQuota: 0,
          communityPostId: null,
        };
      }

      return await this.aiSupportService.askQuestion(
        decoded.userId,
        input.question,
      );
    } catch (error) {
      this.logger.error(`askAiSupport error: ${error.message}`);
      return {
        status: 'ERROR',
        answer: null,
        message: 'Something went wrong. Please try again later.',
        remainingQuota: 0,
        communityPostId: null,
      };
    }
  }
}
