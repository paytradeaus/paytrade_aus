import { Module } from '@nestjs/common';
import { XeroService } from './xero.service';
import { XeroResolver } from './xero.resolver';
import { XeroController } from './xero.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';
import { XeroContactDetails } from 'src/entities/xero-contact-details.entity';
import { XeroProjectDetails } from 'src/entities/xero-project-details.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { XeroBankAccountDetails } from 'src/entities/xero-bank-account-details.entity';
import {
  BankAccounts,
  BankStatements,
  PaymentClaimInvoices,
  PaymentClaims,
} from 'src/entities/banking.entity';
import { XeroContractDetails } from 'src/entities/xero-contract-details.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { XeroContactsService } from './contacts/xero-contacts.service';
import { XeroAccountsService } from './accounts/xero-accounts.service';
import { XeroContractsService } from './contracts/xero-contracts.service';
import { XeroProjectsService } from './projects/xero-projects.service';
import { XeroContactsResolver } from './contacts/xero-contacts.resolver';
import { XeroAccountsResolver } from './accounts/xero-accounts.resolver';
import { XeroProjectsResolver } from './projects/xero-projects.resolver';
import { XeroContractsResolver } from './contracts/xero-contracts.resolver';
import { IntegrationsService } from '../common/integrations.service';
import { IntegrationDetails } from 'src/entities/integration-details.entity';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { XeroSyncLogs } from 'src/entities/xero-sync-logs.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { XeroSchedulerService } from './scheduler/xero-scheduler.service';
import { XeroSchedulerResolver } from './scheduler/xero-scheduler.resolver';
import { ActivityLogService } from '../../activity-log/activity-log.service';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { XeroInvoicesResolver } from './invoicesAndBills/xero-invoices.resolver';
import { XeroInvoicesService } from './invoicesAndBills/xero-invoices.service';
import { XeroInvoicesBills } from 'src/entities/xero-invoices-bills.entity';
import { XeroPaymentsService } from './payments/xero-payments.service';
import { XeroPaymentsResolver } from './payments/xero-payments.resolver';
import { XeroPayments } from 'src/entities/xero-payments.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { PaymentClaimsService } from 'src/api/users/banking/payment-claims/payment-claims.service';
import { VariationDetails } from 'src/entities/variation-details.entity';
import { RetentionDetails } from 'src/entities/retention-details.entity';
import { JournalEntries } from 'src/entities/journal-entries.entity';
import { JournalType } from 'src/entities/journal-type.entity';
import { SubPayments } from 'src/entities/sub-payments.entity';
import { HolidayDetails } from 'src/entities/holiday-details.entity';
import { StatusService } from 'src/api/users/banking/ui-status.service';
import { UiStatusAndActionButtons } from 'src/entities/ui-status-and-action-buttons.entity';
import { PaymentsService } from 'src/api/users/banking/payments/payments.service';
import { FinancialInstitutionsDetails } from 'src/entities/financial-institution-deatils.entity';
import { RetentionSummaryDetails } from 'src/entities/retention-summary.entity';
import { TransactionDetails } from 'src/entities/transaction-details.entity';
import { GenerateABAFileHistory } from 'src/entities/generate-aba-history.entity';
import { FileUploadService } from 'src/api/users/file-upload/file-upload.service';
import { RetentionStatusFunctions } from 'src/api/users/banking/payments/retentions/retention-status-functions';
import { RetentionProgressionFunctions } from 'src/api/users/banking/payments/retentions/retention-progression-functions';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import { BlogResource } from 'src/entities/admin-blogs-resources.entity';
import { NoticeTemplates } from 'src/entities/notices-templates.entity';
import { CmtyDiscussionsIdeas } from 'src/entities/cmty-discussion-idea.entity';
import { CmtyAnswersComments } from 'src/entities/cmty-answers-comments.entity';
import { AuditReport } from 'src/entities/audit-report.entity';
import { NoticeGenDocService } from 'src/api/users/notices/notice-gen-doc.service';
import { ImageService } from 'src/api/users/notices/write-to-image/write-to-image.service';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { PaymentClaimsValidator } from 'src/api/users/banking/payment-claims/payment-claims.validator';
import { XeroWebhookService } from '../../xero-webhooks/webhook.service';
import { BullModule } from '@nestjs/bullmq';
import { XeroRefreshTokenService } from './refreshToken/xeroRefreshToken.service';
import { XeroRefreshTokenWorker } from './refreshToken/xeroRefreshToken.worker';
import { XeroRefreshTokenQueueEvent } from './refreshToken/xeroRefreshToken.QueueEvents';
import { PaymentGatewayService } from '../../payment-gateway/payment-gateway.service';
import { SubscriptionPlanItems } from 'src/entities/subscription-plan-items.entity';
import { SubscriptionPlanDetails } from 'src/entities/subscription-plan-details.entity';
import { SubscriptionPricingPlan } from 'src/entities/subscription-pricing-plan.entity';
import { SubscriptionTransaction } from 'src/entities/subscription-transactions.entity';
import { CompliancesService } from 'src/api/users/compliances/compliances.service';
import { CompliancePTAFunctions } from 'src/api/users/compliances/functions/pta-functions';
import { ComplianceRTAFunctions } from 'src/api/users/compliances/functions/rta-functions';
import {
  ComplianceCheckpoint,
  ComplianceRule,
} from 'src/entities/compliance-details-pro-acc.entity';
import {
  ComplianceChecks,
  ComplianceOfProjects,
  ComplianceSettings,
  PtaCompliances,
  RtaCompliances,
} from 'src/entities/compliances.entity';
import { ReconciliationReport } from 'src/entities/reconciliation-report.entity';
import { Contents } from 'src/entities/admin-contents.entity';
import { MasterTypes } from 'src/entities/master-types.entity';
import { BlogComments } from 'src/entities/admin-blog-comments.entity';
import { PtContentsService } from 'src/api/admin/pt-contents/pt-contents.service';
import { EmailService } from 'src/libs/@email-services/email.service';
import { NoticesService } from 'src/api/users/notices/notices.service';
import { NoticesResolver } from 'src/api/users/notices/notices.resolver';
import { NoticesValidator } from 'src/api/users/notices/notices.validator';
import { NoticeMail } from 'src/entities/notice-mail.enitity';
import { ContractDetailsService } from 'src/api/users/contract-details/contract-details.service';
import { ContractType } from 'src/entities/contract-type.entity';
import { BankAccountsService } from 'src/api/users/banking/bank-accounts/bank-accounts.service';
import { BankAccountsValidator } from 'src/api/users/banking/bank-accounts/bank-accounts.validator';
import { ClientSuppliersDetailsService } from 'src/api/users/client-suppliers-details/client-suppliers-details.service';
import { ProjectsService } from 'src/api/users/projects/projects.service';
import { XeroLogTemplates } from 'src/entities/xero-log-templates.entity';
import { RetentionReversalFunctions } from 'src/api/users/banking/payments/retentions/retention-reversal-functions';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { XeroWaitQueueService } from '../../xero-webhooks/waitQueue/webhookWait.service';
import { XeroWaitQueueWorker } from '../../xero-webhooks/waitQueue/webhookWait.worker';
import { XeroWaitQueueEvent } from '../../xero-webhooks/waitQueue/webhookWait.QueueEvents';
import { StripeCoupons } from 'src/entities/subscription-coupon.entity';
import { CompanyCouponDetails } from 'src/entities/company-coupon-details.entity';
import { AuthService } from 'src/api/auth/auth-guard/auth.service';
import { ObjectStorageModule } from 'src/libs/@object-storage/object-storage.module';

@Module({
  imports: [
    ObjectStorageModule,
    BullModule.registerQueue({
      name: 'xero-refresh-token',
    }),
    BullModule.registerQueue({
      name: 'xero-wait-queue',
    }),
    BullModule.registerQueue({
      name: 'mailQueue',
    }),
    TypeOrmModule.forFeature([
      IntegrationDetails,
      XeroIntegrationDetails,
      XeroContactDetails,
      XeroBankAccountDetails,
      XeroProjectDetails,
      XeroContractDetails,
      XeroInvoicesBills,
      XeroPayments,
      ProjectDetails,
      ClientSuppliersDetails,
      BankAccounts,
      ContractDetails,
      ContractType,
      VariationDetails,
      PaymentClaims,
      PaymentClaimInvoices,
      PaymentDetails,
      SubPayments,
      RetentionDetails,
      JournalEntries,
      JournalType,
      UserDetails,
      AdminDetails,
      EmailTemplates,
      XeroSyncLogs,
      XeroLogTemplates,
      ActivityLogNew,
      ActivityLogTemplates,
      CompanyDetails,
      NoticeDetails,
      CompanyUserRoles,
      HolidayDetails,
      UiStatusAndActionButtons,
      FinancialInstitutionsDetails,
      RetentionSummaryDetails,
      TransactionDetails,
      GenerateABAFileHistory,
      FileAttachments,
      BlogResource,
      NoticeTemplates,
      CmtyDiscussionsIdeas,
      CmtyAnswersComments,
      AuditReport,
      SubscriptionDetails,
      SubscriptionPlanDetails,
      SubscriptionPricingPlan,
      SubscriptionPlanItems,
      SubscriptionTransaction,
      BankStatements,
      ComplianceRule,
      ComplianceChecks,
      ComplianceOfProjects,
      ComplianceCheckpoint,
      PtaCompliances,
      RtaCompliances,
      ComplianceSettings,
      ReconciliationReport,
      Contents,
      MasterTypes,
      BlogComments,
      NoticeMail,
      StripeCoupons,
      CompanyCouponDetails,
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [XeroController],
  providers: [
    AuthService,
    JwtInternalService,
    PaymentClaimsService,
    PaymentsService,
    FileUploadService,
    RetentionStatusFunctions,
    RetentionProgressionFunctions,
    IntegrationsService,
    XeroService,
    XeroContactsService,
    XeroAccountsService,
    XeroContractsService,
    XeroProjectsService,
    XeroSchedulerService,
    XeroInvoicesService,
    XeroPaymentsService,
    ActivityLogService,
    XeroResolver,
    XeroContactsResolver,
    XeroAccountsResolver,
    XeroContractsResolver,
    XeroProjectsResolver,
    XeroSchedulerResolver,
    XeroInvoicesResolver,
    XeroPaymentsResolver,
    StatusService,
    NoticeGenDocService,
    ImageService,
    PaymentClaimsValidator,
    XeroWebhookService,
    XeroRefreshTokenService,
    XeroRefreshTokenWorker,
    XeroRefreshTokenQueueEvent,
    PaymentGatewayService,
    CompliancesService,
    CompliancePTAFunctions,
    ComplianceRTAFunctions,
    PtContentsService,
    EmailService,
    NoticesService,
    NoticesValidator,
    ContractDetailsService,
    BankAccountsService,
    BankAccountsValidator,
    ClientSuppliersDetailsService,
    ProjectsService,
    RetentionReversalFunctions,
    EmailQueueProducer,
    XeroWaitQueueService,
    XeroWaitQueueWorker,
    XeroWaitQueueEvent,
  ],
  exports: [XeroRefreshTokenService, XeroInvoicesService, BullModule],
})
export class XeroModule {}
