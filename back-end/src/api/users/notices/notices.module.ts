import { Module } from '@nestjs/common';
import { NoticesResolver } from './notices.resolver';
import { NoticesService } from './notices.service';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { UserDetails } from 'src/entities/user-details.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { ContractType } from 'src/entities/contract-type.entity';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { NoticesValidator } from './notices.validator';
import {
  BankAccounts,
  BankStatements,
  PaymentClaimInvoices,
  PaymentClaims,
} from 'src/entities/banking.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { NoticeTemplates } from 'src/entities/notices-templates.entity';
import { NoticeMail } from 'src/entities/notice-mail.enitity';
import { PtContentsService } from 'src/api/admin/pt-contents/pt-contents.service';
import { EmailService } from 'src/libs/@email-services/email.service';
import { Contents } from 'src/entities/admin-contents.entity';
import { MasterTypes } from 'src/entities/master-types.entity';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { BlogResource } from 'src/entities/admin-blogs-resources.entity';
import { BlogComments } from 'src/entities/admin-blog-comments.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { ContractDetailsService } from '../contract-details/contract-details.service';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { VariationDetails } from 'src/entities/variation-details.entity';
import { CronService } from './cron.services';
import { ScheduleModule } from '@nestjs/schedule';
import { UserAccessService } from '../user-access/user-access.service';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { Invitations } from 'src/entities/invitations.entity';
import { NoticeGenDocService } from './notice-gen-doc.service';
import { FileUploadService } from '../file-upload/file-upload.service';
import { AuditReport } from 'src/entities/audit-report.entity';
import { RetentionDetails } from 'src/entities/retention-details.entity';
import { FinancialInstitutionsDetails } from 'src/entities/financial-institution-deatils.entity';
import { SubPayments } from 'src/entities/sub-payments.entity';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { ImageService } from './write-to-image/write-to-image.service';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import { StatusService } from '../banking/ui-status.service';
import { UiStatusAndActionButtons } from 'src/entities/ui-status-and-action-buttons.entity';
import { CmtyDiscussionsIdeas } from 'src/entities/cmty-discussion-idea.entity';
import { CmtyAnswersComments } from 'src/entities/cmty-answers-comments.entity';
import { CompliancesService } from '../compliances/compliances.service';
import {
  ComplianceChecks,
  ComplianceOfProjects,
  ComplianceSettings,
  PtaCompliances,
  RtaCompliances,
} from 'src/entities/compliances.entity';
import {
  ComplianceCheckpoint,
  ComplianceRule,
} from 'src/entities/compliance-details-pro-acc.entity';
import { CompliancePTAFunctions } from '../compliances/functions/pta-functions';
import { ComplianceRTAFunctions } from '../compliances/functions/rta-functions';
import { ReconciliationReport } from 'src/entities/reconciliation-report.entity';
import { TransactionDetails } from 'src/entities/transaction-details.entity';
import { HolidayDetails } from 'src/entities/holiday-details.entity';
import { PaymentGatewayService } from 'src/api/common/payment-gateway/payment-gateway.service';
import { SubscriptionPlanItems } from 'src/entities/subscription-plan-items.entity';
import { SubscriptionPlanDetails } from 'src/entities/subscription-plan-details.entity';
import { SubscriptionPricingPlan } from 'src/entities/subscription-pricing-plan.entity';
import { SubscriptionTransaction } from 'src/entities/subscription-transactions.entity';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { BullModule } from '@nestjs/bullmq';
import { StripeCoupons } from 'src/entities/subscription-coupon.entity';
import { CompanyCouponDetails } from 'src/entities/company-coupon-details.entity';
import { IntegrationDetails } from 'src/entities/integration-details.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserDetails,
      CompanyDetails,
      AdminDetails,
      ProjectDetails,
      ContractDetails,
      ActivityLogNew,
      ActivityLogTemplates,
      ContractType,
      FileAttachments,
      NoticeDetails,
      BankAccounts,
      NoticeTemplates,
      NoticeMail,
      Contents,
      MasterTypes,
      EmailTemplates,
      BlogResource,
      BlogComments,
      PaymentClaims,
      PaymentDetails,
      RetentionDetails,
      ContractDetails,
      ClientSuppliersDetails,
      VariationDetails,
      AuditReport,
      PaymentClaimInvoices,
      CompanyUserRoles,
      Invitations,
      FinancialInstitutionsDetails,
      SubPayments,
      SubscriptionDetails,
      UiStatusAndActionButtons,
      CmtyDiscussionsIdeas,
      CmtyAnswersComments,
      ComplianceChecks,
      PtaCompliances,
      RtaCompliances,
      ComplianceOfProjects,
      ComplianceCheckpoint,
      ComplianceRule,
      ComplianceSettings,
      ReconciliationReport,
      TransactionDetails,
      HolidayDetails,
      BankStatements,
      SubscriptionPlanItems,
      SubscriptionPlanDetails,
      SubscriptionPricingPlan,
      SubscriptionTransaction,
      StripeCoupons,
      CompanyCouponDetails,
      IntegrationDetails,
    ]),
    ScheduleModule.forRoot(),
    BullModule.registerQueue({
      name: 'mailQueue',
    }),
  ],

  providers: [
    NoticesResolver,
    NoticesService,
    ActivityLogService,
    JwtInternalService,
    NoticesValidator,
    PtContentsService,
    EmailService,
    ContractDetailsService,
    CronService,
    NoticeGenDocService,
    FileUploadService,
    UserAccessService,
    ImageService,
    StatusService,
    CompliancesService,
    CompliancePTAFunctions,
    ComplianceRTAFunctions,
    PaymentGatewayService,
    EmailQueueProducer,
  ],
  exports: [NoticesService],
})
export class NoticesModule {}
