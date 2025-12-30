import { Module } from '@nestjs/common';
import { CommunicationManagementService } from './communication-management.service';
import { CommunicationManagementResolver } from './communication-management.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { AdminDetails } from '../../../entities/admin-details.entity';
import { AdminGroupDetails } from '../../../entities/admin-group-details.entity';
import { AdminGroup } from '../../../entities/admin-group.entity';
import { PtGroupsService } from '../pt-groups/pt-groups.service';
import { AdminMenuDetails } from '../../../entities/admin-menu-details.entity';
import { AdminGroupMenuPriv } from '../../../entities/admin-group-menu-priv.entity';
import { EmailService } from 'src/libs/@email-services/email.service';
import { AuthService } from 'src/api/auth/auth-guard/auth.service';
import { UserDetails } from 'src/entities/user-details.entity';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import { MasterTypes } from 'src/entities/master-types.entity';
import { EmailGenerator } from 'src/libs/@email-services/email-template-generators/email-generators';
import { CommunicationEmails } from 'src/entities/communication-emails.entity';
import { PtContentsService } from '../pt-contents/pt-contents.service';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { Contents } from 'src/entities/admin-contents.entity';
import { BlogResource } from 'src/entities/admin-blogs-resources.entity';
import { BlogComments } from 'src/entities/admin-blog-comments.entity';
// import { EmailQueueProducer } from 'src/libs/@email-services/email-queuers/producer';
import { CurrencyMaster } from 'src/entities/currency-master.entity';
import { CommonSettings } from 'src/entities/common-settings.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import { BankAccounts } from 'src/entities/banking.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { BullModule } from '@nestjs/bullmq';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'mailQueue',
    }),
    TypeOrmModule.forFeature([
      AdminDetails,
      AdminGroupDetails,
      AdminGroup,
      AdminMenuDetails,
      AdminGroupMenuPriv,
      CommunicationEmails,
      FileAttachments,
      CompanyUserRoles,
      UserDetails,
      CompanyDetails,
      MasterTypes,
      EmailTemplates,
      Contents,
      BlogResource,
      BlogComments,
      CurrencyMaster,
      CommonSettings,
      ActivityLogNew,
      ActivityLogTemplates,
      BankAccounts,
      NoticeDetails,
    ]),
  ],
  providers: [
    CommunicationManagementResolver,
    CommunicationManagementService,
    PtGroupsService,
    EmailGenerator,
    EmailService,
    AuthService,
    PtContentsService,
    // EmailQueueProducer,
    ActivityLogService,
    JwtInternalService,
    EmailQueueProducer,
  ],
  exports: [CommunicationManagementService],
})
export class CommunicationManagementModule {}
