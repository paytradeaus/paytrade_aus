import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CommunityBotService } from './community-bot.service';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { GraphQLJSON } from 'graphql-type-json';

@Resolver()
export class CommunityBotResolver {
  constructor(private readonly communityBotService: CommunityBotService) {}

  @Mutation(() => GraphQLJSON, { nullable: true })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN)
  async triggerBotContentGeneration() {
    const result = await this.communityBotService.triggerManualGeneration();
    if (!result) {
      return { success: false, message: 'Content generation failed' };
    }
    return {
      success: true,
      questionsCreated: result.questionsCreated,
      answersCreated: result.answersCreated,
      botsCreated: result.botsCreated,
    };
  }

  @Mutation(() => GraphQLJSON)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN)
  async generateBotUsers(
    @Args('count', { type: () => Number, defaultValue: 5 }) count: number,
  ) {
    try {
      const clampedCount = Math.min(Math.max(count, 1), 20);
      const created = await this.communityBotService.createBotBatch(clampedCount);
      return {
        success: true,
        botsCreated: created,
        message: `Successfully created ${created} bot users`,
      };
    } catch (error) {
      return {
        success: false,
        botsCreated: 0,
        message: error.message || 'Failed to create bot users',
      };
    }
  }

  @Mutation(() => GraphQLJSON)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN)
  async generateBotQuestion() {
    try {
      const result = await this.communityBotService.generateSingleQuestion();
      if (!result) {
        return { success: false, message: 'Question generation failed' };
      }
      return {
        success: true,
        questionTitle: result.questionTitle,
        answersCreated: result.answersCreated,
        botsCreated: result.botsCreated,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to generate question',
      };
    }
  }

  @Mutation(() => GraphQLJSON)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN)
  async generateBotAnswers(
    @Args('discussionId', { type: () => String }) discussionId: string,
  ) {
    try {
      const result = await this.communityBotService.generateAnswersForDiscussion(discussionId);
      return {
        success: true,
        answersCreated: result.answersCreated,
        botsCreated: result.botsCreated,
      };
    } catch (error) {
      return {
        success: false,
        answersCreated: 0,
        message: error.message || 'Failed to generate answers',
      };
    }
  }

  @Query(() => GraphQLJSON)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.RESTRICTED_PORTAL_ADMIN)
  async getCommunityBotStats() {
    return this.communityBotService.getBotStats();
  }
}
