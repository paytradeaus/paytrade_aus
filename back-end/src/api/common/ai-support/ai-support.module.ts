import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiSupportService } from './ai-support.service';
import { AiSupportResolver } from './ai-support.resolver';
import { AiSupportUsage } from 'src/entities/ai-support-usage.entity';
import { FAQ } from 'src/entities/admin-faq.entity';
import { BlogResource } from 'src/entities/admin-blogs-resources.entity';
import { CmtyDiscussionsIdeas } from 'src/entities/cmty-discussion-idea.entity';
import { CmtyAnswersComments } from 'src/entities/cmty-answers-comments.entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { MasterTypes } from 'src/entities/master-types.entity';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiSupportUsage,
      FAQ,
      BlogResource,
      CmtyDiscussionsIdeas,
      CmtyAnswersComments,
      CompanyUserRoles,
      SubscriptionDetails,
      UserDetails,
      MasterTypes,
    ]),
  ],
  providers: [AiSupportService, AiSupportResolver, JwtInternalService],
  exports: [AiSupportService],
})
export class AiSupportModule {}
