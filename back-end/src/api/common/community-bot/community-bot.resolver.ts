import { Resolver, Mutation, Query } from '@nestjs/graphql';
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
    const post = await this.communityBotService.triggerManualGeneration();
    if (!post) {
      return { success: false, message: 'Content generation failed' };
    }
    return {
      success: true,
      postId: post.id,
      title: post.title,
    };
  }

  @Query(() => GraphQLJSON)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.RESTRICTED_PORTAL_ADMIN)
  async getCommunityBotStats() {
    return this.communityBotService.getBotStats();
  }
}
