import { Module } from '@nestjs/common';
import { SupportResolver } from './support.resolver';
import { SupportService } from './support.service';
import { EmailService } from 'src/libs/@email-services/email.service';
import { SupportController } from './support.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  SupportTickets,
  TicketMails,
} from 'src/entities/support-tickets.entity';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { PtAdminResolver } from '../admin/pt-admin/pt-admin.resolver';
import { PtAdminService } from '../admin/pt-admin/pt-admin.service';
import { PtGroupsService } from '../admin/pt-groups/pt-groups.service';
import { PtContentsService } from '../admin/pt-contents/pt-contents.service';
import { ActivityLogService } from '../common/activity-log/activity-log.service';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { AuthService } from '../auth/auth-guard/auth.service';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { AdminGroupDetails } from 'src/entities/admin-group-details.entity';
import { AdminGroup } from 'src/entities/admin-group.entity';
import { AdminMenuDetails } from 'src/entities/admin-menu-details.entity';
import { AdminGroupMenuPriv } from 'src/entities/admin-group-menu-priv.entity';
import { CommunicationEmails } from 'src/entities/communication-emails.entity';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { MasterTypes } from 'src/entities/master-types.entity';
import { Contents } from 'src/entities/admin-contents.entity';
import { BlogResource } from 'src/entities/admin-blogs-resources.entity';
import { BlogComments } from 'src/entities/admin-blog-comments.entity';
import { AdminEmailVerificationDetails } from 'src/entities/admin-email-verification.entity';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { BankAccounts } from 'src/entities/banking.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { BullModule } from '@nestjs/bullmq';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SupportTickets,
      TicketMails,
      EmailTemplates,
      AdminDetails,
      AdminGroupDetails,
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
      AdminEmailVerificationDetails,
      ActivityLogNew,
      ActivityLogTemplates,
      BankAccounts,
      NoticeDetails,
    ]),
    BullModule.registerQueue({
      name: 'mailQueue',
    }),
  ],
  controllers: [SupportController],
  providers: [
    SupportResolver,
    SupportService,
    EmailService,
    PtAdminResolver,
    PtAdminService,
    PtGroupsService,
    PtContentsService,
    ActivityLogService,
    JwtInternalService,
    AuthService,
    EmailQueueProducer,
  ],
})
export class SupportModule {}
