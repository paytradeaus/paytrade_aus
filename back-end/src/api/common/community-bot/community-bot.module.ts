import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { CommunityBotService } from './community-bot.service';
import { CommunityBotResolver } from './community-bot.resolver';
import { CmtyDiscussionsIdeas } from 'src/entities/cmty-discussion-idea.entity';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { MasterTypes } from 'src/entities/master-types.entity';
import { SeoKeyword } from 'src/entities/seo-keyword.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      CmtyDiscussionsIdeas,
      AdminDetails,
      MasterTypes,
      SeoKeyword,
      UserDetails,
    ]),
  ],
  providers: [CommunityBotService, CommunityBotResolver, JwtInternalService],
  exports: [CommunityBotService],
})
export class CommunityBotModule {}
