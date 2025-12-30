import { Module } from '@nestjs/common';
import { PtAdminAccessService } from './pt-admin-access.service';
import { PtAdminAccessResolver } from './pt-admin-access.resolver';
import { AdminDetails } from '../../../entities/admin-details.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminGroupDetails } from '../../../entities/admin-group-details.entity';
import { UserDetails } from '../../../entities/user-details.entity';
import { PtAdminService } from '../pt-admin/pt-admin.service';
import { AdminGroup } from '../../../entities/admin-group.entity';
import { EmailService } from '../../../libs/@email-services/email.service';
import { CompanyDetails } from '../../../entities/company-details.entity';
import { EmailVerificationDetails } from 'src/entities/email-verification-entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import { MasterTypes } from 'src/entities/master-types.entity';
import { EmailGenerator } from 'src/libs/@email-services/email-template-generators/email-generators';
import { CommunicationEmails } from 'src/entities/communication-emails.entity';
import { Contents } from 'src/entities/admin-contents.entity';
import { PtContentsService } from '../pt-contents/pt-contents.service';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { BlogResource } from 'src/entities/admin-blogs-resources.entity';
import { BlogComments } from 'src/entities/admin-blog-comments.entity';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { ImportedCompanyExcel } from 'src/entities/company-imported-excel.entity';
// import { EmailQueueProducer } from 'src/libs/@email-services/email-queuers/producer';
import { FinancialInstitutionsDetails } from 'src/entities/financial-institution-deatils.entity';
import { SignupService } from 'src/api/users/signup/signup.service';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { SubscriptionPlanDetails } from 'src/entities/subscription-plan-details.entity';
import { Invitations } from 'src/entities/invitations.entity';
import { AdminEmailVerificationDetails } from 'src/entities/admin-email-verification.entity';
import { BankAccounts } from 'src/entities/banking.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { HolidayDetails } from 'src/entities/holiday-details.entity';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { HolidaysCronService } from './pt-holidays.cron.services';
import { BullModule } from '@nestjs/bullmq';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { IntegrationDetails } from 'src/entities/integration-details.entity';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminDetails,
      AdminGroupDetails,
      UserDetails,
      AdminGroup,
      CompanyDetails,
      CompanyUserRoles,
      EmailVerificationDetails,
      CommunicationEmails,
      FileAttachments,
      MasterTypes,
      Contents,
      EmailTemplates,
      BlogResource,
      BlogComments,
      ActivityLogNew,
      ActivityLogTemplates,
      ImportedCompanyExcel,
      FinancialInstitutionsDetails,
      SubscriptionDetails,
      SubscriptionPlanDetails,
      Invitations,
      AdminEmailVerificationDetails,
      BankAccounts,
      NoticeDetails,
      HolidayDetails,
      IntegrationDetails,
      XeroIntegrationDetails,
    ]),
    BullModule.registerQueue({
      name: 'mailQueue',
    }),
  ],
  providers: [
    JwtInternalService,
    PtAdminAccessService,
    PtAdminAccessResolver,
    EmailGenerator,
    PtAdminService,
    EmailService,
    PtContentsService,
    ActivityLogService,
    SignupService,
    HolidaysCronService,
    // EmailQueueProducer,
    EmailQueueProducer,
  ],
})
export class PtAdminAccessModule {}
