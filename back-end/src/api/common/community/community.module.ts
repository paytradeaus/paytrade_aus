import { Module } from '@nestjs/common';
import { CommunityService } from './community.service';
import { CommunityResolver } from './community.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { MasterTypes } from 'src/entities/master-types.entity';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { PtContentsService } from 'src/api/admin/pt-contents/pt-contents.service';
import { AuthService } from 'src/api/auth/auth-guard/auth.service';
import { EmailGenerator } from 'src/libs/@email-services/email-template-generators/email-generators';
import { EmailService } from 'src/libs/@email-services/email.service';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CmtyDiscussionsIdeas } from 'src/entities/cmty-discussion-idea.entity';
import { CmtyAnswersComments } from 'src/entities/cmty-answers-comments.entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { CmtyVoteLikesFlags } from 'src/entities/cmty-vote-likes-flags.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { BankAccounts } from 'src/entities/banking.entity';
import { BullModule } from '@nestjs/bullmq';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserDetails,
      AdminDetails,
      CompanyDetails,
      CompanyUserRoles,
      MasterTypes,
      EmailTemplates,
      FileAttachments,
      ActivityLogNew,
      ActivityLogTemplates,
      CmtyDiscussionsIdeas,
      CmtyAnswersComments,
      CmtyVoteLikesFlags,
      BankAccounts,
      NoticeDetails,
    ]),
    BullModule.registerQueue({
      name: 'mailQueue',
    }),
  ],
  providers: [
    CommunityService,
    CommunityResolver,
    EmailGenerator,
    EmailService,
    AuthService,
    ActivityLogService,
    JwtInternalService,
    EmailQueueProducer,
  ],
})
export class CommunityModule {}
