import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactsService } from './contacts.service';
import { ContactsResolver } from './contacts.resolver';
import { UserDetails } from 'src/entities/user-details.entity';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { EmailService } from 'src/libs/@email-services/email.service';
import { EmailGenerator } from 'src/libs/@email-services/email-template-generators/email-generators';
import { ContactSubmissions } from 'src/entities/contact-submissions.entity';
import { PtAdminResolver } from '../admin/pt-admin/pt-admin.resolver';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { PtAdminService } from '../admin/pt-admin/pt-admin.service';
import { PtGroupsService } from '../admin/pt-groups/pt-groups.service';
import { AdminGroupDetails } from 'src/entities/admin-group-details.entity';
import { AdminMenuDetails } from 'src/entities/admin-menu-details.entity';
import { AdminGroupMenuPriv } from 'src/entities/admin-group-menu-priv.entity';
import { PtContentsService } from '../admin/pt-contents/pt-contents.service';
import { Contents } from 'src/entities/admin-contents.entity';
import { MasterTypes } from 'src/entities/master-types.entity';
import { BlogComments } from 'src/entities/admin-blog-comments.entity';
import { AuthService } from '../auth/auth-guard/auth.service';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { AdminGroup } from 'src/entities/admin-group.entity';
import { BlogResource } from 'src/entities/admin-blogs-resources.entity';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { AdminEmailVerificationDetails } from 'src/entities/admin-email-verification.entity';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { ActivityLogService } from '../common/activity-log/activity-log.service';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import { BankAccounts } from 'src/entities/banking.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { BullModule } from '@nestjs/bullmq';
// import { EmailQueueProducer } from 'src/libs/@email-services/email-queuers/producer';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContactSubmissions,
      UserDetails,
      AdminDetails,
      EmailTemplates,
      AdminGroupDetails,
      AdminMenuDetails,
      AdminGroupMenuPriv,
      Contents,
      MasterTypes,
      BlogComments,
      BlogResource,
      CompanyUserRoles,
      CompanyDetails,
      AdminGroup,
      FileAttachments,
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
  providers: [
    ContactsService,
    ContactsResolver,
    PtContentsService,
    EmailService,
    EmailGenerator,
    PtGroupsService,
    AuthService,
    PtAdminResolver,
    PtAdminService,
    JwtInternalService,
    ActivityLogService,
    // EmailQueueProducer,
    EmailQueueProducer,
  ],
  exports: [ContactsService],
})
export class ContactsModule {}
