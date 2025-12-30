import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractDetailsService } from './contract-details.service';
import { ContractDetailsResolver } from './contract-details.resolver';
import { UserDetails } from 'src/entities/user-details.entity';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { VariationDetails } from 'src/entities/variation-details.entity';
import { ContractType } from 'src/entities/contract-type.entity';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import {
  BankAccounts,
  BankStatements,
  PaymentClaimInvoices,
  PaymentClaims,
} from 'src/entities/banking.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { XeroContractsService } from 'src/api/common/integrations/xero/contracts/xero-contracts.service';
import { XeroService } from 'src/api/common/integrations/xero/xero.service';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';
import { XeroContactDetails } from 'src/entities/xero-contact-details.entity';
import { XeroBankAccountDetails } from 'src/entities/xero-bank-account-details.entity';
import { XeroProjectDetails } from 'src/entities/xero-project-details.entity';
import { XeroContractDetails } from 'src/entities/xero-contract-details.entity';
import { IntegrationDetails } from 'src/entities/integration-details.entity';
import { XeroSyncLogs } from 'src/entities/xero-sync-logs.entity';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
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
import { PtContentsService } from 'src/api/admin/pt-contents/pt-contents.service';
import { EmailService } from 'src/libs/@email-services/email.service';
import { ReconciliationReport } from 'src/entities/reconciliation-report.entity';
import { AuditReport } from 'src/entities/audit-report.entity';
import { TransactionDetails } from 'src/entities/transaction-details.entity';
import { HolidayDetails } from 'src/entities/holiday-details.entity';
import { SubPayments } from 'src/entities/sub-payments.entity';
import { Contents } from 'src/entities/admin-contents.entity';
import { MasterTypes } from 'src/entities/master-types.entity';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { BlogResource } from 'src/entities/admin-blogs-resources.entity';
import { BlogComments } from 'src/entities/admin-blog-comments.entity';
import { BullModule } from '@nestjs/bullmq';
import { XeroRefreshTokenService } from 'src/api/common/integrations/xero/refreshToken/xeroRefreshToken.service';
import { NoticesService } from '../notices/notices.service';
import { NoticesValidator } from '../notices/notices.validator';
import { StatusService } from '../banking/ui-status.service';
import { FinancialInstitutionsDetails } from 'src/entities/financial-institution-deatils.entity';
import { NoticeMail } from 'src/entities/notice-mail.enitity';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { RetentionDetails } from 'src/entities/retention-details.entity';
import { NoticeGenDocService } from '../notices/notice-gen-doc.service';
import { PaymentGatewayService } from 'src/api/common/payment-gateway/payment-gateway.service';
import { NoticeTemplates } from 'src/entities/notices-templates.entity';
import { UiStatusAndActionButtons } from 'src/entities/ui-status-and-action-buttons.entity';
import { FileUploadService } from '../file-upload/file-upload.service';
import { ImageService } from '../notices/write-to-image/write-to-image.service';
import { SubscriptionPlanItems } from 'src/entities/subscription-plan-items.entity';
import { SubscriptionPlanDetails } from 'src/entities/subscription-plan-details.entity';
import { SubscriptionPricingPlan } from 'src/entities/subscription-pricing-plan.entity';
import { SubscriptionTransaction } from 'src/entities/subscription-transactions.entity';
import { CmtyDiscussionsIdeas } from 'src/entities/cmty-discussion-idea.entity';
import { CmtyAnswersComments } from 'src/entities/cmty-answers-comments.entity';
import { CmtyVoteLikesFlags } from 'src/entities/cmty-vote-likes-flags.entity';
import { XeroLogTemplates } from 'src/entities/xero-log-templates.entity';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { StripeCoupons } from 'src/entities/subscription-coupon.entity';
import { CompanyCouponDetails } from 'src/entities/company-coupon-details.entity';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'xero-refresh-token',
    }),
    BullModule.registerQueue({
      name: 'mailQueue',
    }),
    TypeOrmModule.forFeature([
      UserDetails,
      CompanyDetails,
      CompanyUserRoles,
      AdminDetails,
      ProjectDetails,
      ClientSuppliersDetails,
      ContractDetails,
      ActivityLogNew,
      ActivityLogTemplates,
      VariationDetails,
      ContractType,
      FileAttachments,
      PaymentClaims,
      PaymentDetails,
      BankAccounts,
      NoticeDetails,
      XeroIntegrationDetails,
      XeroContactDetails,
      XeroBankAccountDetails,
      XeroProjectDetails,
      XeroContractDetails,
      IntegrationDetails,
      XeroSyncLogs,
      XeroLogTemplates,
      ComplianceChecks,
      RtaCompliances,
      PtaCompliances,
      ComplianceOfProjects,
      ComplianceCheckpoint,
      ComplianceRule,
      ReconciliationReport,
      AuditReport,
      TransactionDetails,
      ComplianceSettings,
      HolidayDetails,
      SubPayments,
      Contents,
      MasterTypes,
      EmailTemplates,
      BlogResource,
      BlogComments,
      FinancialInstitutionsDetails,
      NoticeMail,
      SubscriptionDetails,
      RetentionDetails,
      PaymentClaimInvoices,
      NoticeTemplates,
      UiStatusAndActionButtons,
      SubscriptionPlanItems,
      SubscriptionPlanDetails,
      SubscriptionPricingPlan,
      SubscriptionTransaction,
      CmtyDiscussionsIdeas,
      CmtyAnswersComments,
      CmtyVoteLikesFlags,
      BankStatements,
      StripeCoupons,
      CompanyCouponDetails,
    ]),
  ],
  providers: [
    JwtInternalService,
    ContractDetailsResolver,
    ContractDetailsService,
    ActivityLogService,
    XeroService,
    XeroContractsService,
    CompliancesService,
    CompliancePTAFunctions,
    ComplianceRTAFunctions,
    PtContentsService,
    EmailService,
    XeroRefreshTokenService,
    NoticesService,
    NoticesValidator,
    StatusService,
    NoticeGenDocService,
    PaymentGatewayService,
    FileUploadService,
    ImageService,
    EmailQueueProducer,
  ],
  exports: [ContractDetailsService],
})
export class ContractDetailsModule {}
