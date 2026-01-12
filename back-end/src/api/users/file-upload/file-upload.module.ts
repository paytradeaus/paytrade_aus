import { Module } from '@nestjs/common';
import { FileUploadService } from './file-upload.service';
import { FileUploadResolver } from './file-upload.resolver';
import { FileServeController } from './file-serve.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { BlogResource } from 'src/entities/admin-blogs-resources.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { VariationDetails } from 'src/entities/variation-details.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { NoticeTemplates } from 'src/entities/notices-templates.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { AuditReport } from 'src/entities/audit-report.entity';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import {
  BankAccounts,
  BankStatements,
  PaymentClaims,
} from 'src/entities/banking.entity';
import { CmtyDiscussionsIdeas } from 'src/entities/cmty-discussion-idea.entity';
import { CmtyAnswersComments } from 'src/entities/cmty-answers-comments.entity';
import { PtContentsService } from 'src/api/admin/pt-contents/pt-contents.service';
import { Contents } from 'src/entities/admin-contents.entity';
import { MasterTypes } from 'src/entities/master-types.entity';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { BlogComments } from 'src/entities/admin-blog-comments.entity';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { PtAdminAccessService } from 'src/api/admin/pt-admin-access/pt-admin-access.service';
import { EmailGenerator } from 'src/libs/@email-services/email-template-generators/email-generators';
import { PtAdminService } from 'src/api/admin/pt-admin/pt-admin.service';
import { EmailService } from 'src/libs/@email-services/email.service';
import { SignupService } from '../signup/signup.service';
import { HolidaysCronService } from 'src/api/admin/pt-admin-access/pt-holidays.cron.services';
import { AdminGroupDetails } from 'src/entities/admin-group-details.entity';
import { AdminGroup } from 'src/entities/admin-group.entity';
import { EmailVerificationDetails } from 'src/entities/email-verification-entity';
import { CommunicationEmails } from 'src/entities/communication-emails.entity';
import { ImportedCompanyExcel } from 'src/entities/company-imported-excel.entity';
import { FinancialInstitutionsDetails } from 'src/entities/financial-institution-deatils.entity';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { SubscriptionPlanDetails } from 'src/entities/subscription-plan-details.entity';
import { Invitations } from 'src/entities/invitations.entity';
import { AdminEmailVerificationDetails } from 'src/entities/admin-email-verification.entity';
import { HolidayDetails } from 'src/entities/holiday-details.entity';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { BullModule } from '@nestjs/bullmq';
import { IntegrationDetails } from 'src/entities/integration-details.entity';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FileAttachments,
      UserDetails,
      CompanyUserRoles,
      CompanyDetails,
      AdminDetails,
      ActivityLogNew,
      ActivityLogTemplates,
      BlogResource,
      BlogComments,
      ContractDetails,
      VariationDetails,
      PaymentDetails,
      NoticeTemplates,
      NoticeDetails,
      AuditReport,
      BankAccounts,
      CmtyDiscussionsIdeas,
      CmtyAnswersComments,
      Contents,
      MasterTypes,
      EmailTemplates,
      AdminGroupDetails,
      AdminGroup,
      EmailVerificationDetails,
      CommunicationEmails,
      ImportedCompanyExcel,
      FinancialInstitutionsDetails,
      SubscriptionDetails,
      SubscriptionPlanDetails,
      Invitations,
      AdminEmailVerificationDetails,
      HolidayDetails,
      PaymentClaims,
      BankStatements,
      IntegrationDetails,
      XeroIntegrationDetails,
    ]),
    BullModule.registerQueue({
      name: 'mailQueue',
    }),
  ],
  controllers: [FileServeController],
  providers: [
    JwtInternalService,
    FileUploadResolver,
    FileUploadService,
    ActivityLogService,
    PtContentsService,
    PtAdminAccessService,
    EmailGenerator,
    PtAdminService,
    EmailService,
    SignupService,
    HolidaysCronService,
    EmailQueueProducer,
  ],
  exports: [FileUploadService],
})
export class FileUploadModule {}
