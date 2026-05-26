import { Module } from '@nestjs/common';
import { XeroWebhookResolver } from './webhook.resolver';
import { XeroWebhookService } from './webhook.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { XeroContactDetails } from 'src/entities/xero-contact-details.entity';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';
import { XeroService } from '../integrations/xero/xero.service';
import { XeroContactsService } from '../integrations/xero/contacts/xero-contacts.service';
import { IntegrationDetails } from 'src/entities/integration-details.entity';
import { XeroSyncLogs } from 'src/entities/xero-sync-logs.entity';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { XeroInvoicesBills } from 'src/entities/xero-invoices-bills.entity';
import { XeroContractDetails } from 'src/entities/xero-contract-details.entity';
import { XeroProjectDetails } from 'src/entities/xero-project-details.entity';
import { PaymentClaimsService } from 'src/api/users/banking/payment-claims/payment-claims.service';
import {
  BankAccounts,
  BankStatements,
  PaymentClaimInvoices,
  PaymentClaims,
} from 'src/entities/banking.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { VariationDetails } from 'src/entities/variation-details.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { RetentionDetails } from 'src/entities/retention-details.entity';
import { JournalEntries } from 'src/entities/journal-entries.entity';
import { JournalType } from 'src/entities/journal-type.entity';
import { SubPayments } from 'src/entities/sub-payments.entity';
import { HolidayDetails } from 'src/entities/holiday-details.entity';
import { StatusService } from 'src/api/users/banking/ui-status.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { UiStatusAndActionButtons } from 'src/entities/ui-status-and-action-buttons.entity';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { XeroPayments } from 'src/entities/xero-payments.entity';
import { XeroBankAccountDetails } from 'src/entities/xero-bank-account-details.entity';
import { NoticeTemplates } from 'src/entities/notices-templates.entity';
import { NoticeGenDocService } from 'src/api/users/notices/notice-gen-doc.service';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { FileUploadService } from 'src/api/users/file-upload/file-upload.service';
import { ImageService } from 'src/api/users/notices/write-to-image/write-to-image.service';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import { BlogResource } from 'src/entities/admin-blogs-resources.entity';
import { CmtyDiscussionsIdeas } from 'src/entities/cmty-discussion-idea.entity';
import { CmtyAnswersComments } from 'src/entities/cmty-answers-comments.entity';
import { AuditReport } from 'src/entities/audit-report.entity';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { PaymentClaimsValidator } from 'src/api/users/banking/payment-claims/payment-claims.validator';
import { PaymentsService } from 'src/api/users/banking/payments/payments.service';
import { FinancialInstitutionsDetails } from 'src/entities/financial-institution-deatils.entity';
import { RetentionSummaryDetails } from 'src/entities/retention-summary.entity';
import { TransactionDetails } from 'src/entities/transaction-details.entity';
import { GenerateABAFileHistory } from 'src/entities/generate-aba-history.entity';
import { RetentionStatusFunctions } from 'src/api/users/banking/payments/retentions/retention-status-functions';
import { RetentionProgressionFunctions } from 'src/api/users/banking/payments/retentions/retention-progression-functions';
import { BullModule } from '@nestjs/bullmq';
import { XeroRefreshTokenService } from 'src/api/common/integrations/xero/refreshToken/xeroRefreshToken.service';
import { CompliancesService } from 'src/api/users/compliances/compliances.service';
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
import { CompliancePTAFunctions } from 'src/api/users/compliances/functions/pta-functions';
import { ComplianceRTAFunctions } from 'src/api/users/compliances/functions/rta-functions';
import { PtContentsService } from 'src/api/admin/pt-contents/pt-contents.service';
import { EmailService } from 'src/libs/@email-services/email.service';
import { ReconciliationReport } from 'src/entities/reconciliation-report.entity';
import { Contents } from 'src/entities/admin-contents.entity';
import { MasterTypes } from 'src/entities/master-types.entity';
import { BlogComments } from 'src/entities/admin-blog-comments.entity';
import { NoticesService } from 'src/api/users/notices/notices.service';
import { NoticesValidator } from 'src/api/users/notices/notices.validator';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { NoticeMail } from 'src/entities/notice-mail.enitity';
import { PaymentGatewayService } from '../payment-gateway/payment-gateway.service';
import { SubscriptionPlanItems } from 'src/entities/subscription-plan-items.entity';
import { SubscriptionPlanDetails } from 'src/entities/subscription-plan-details.entity';
import { SubscriptionPricingPlan } from 'src/entities/subscription-pricing-plan.entity';
import { SubscriptionTransaction } from 'src/entities/subscription-transactions.entity';
import { ClientSuppliersDetailsService } from 'src/api/users/client-suppliers-details/client-suppliers-details.service';
import { ContractDetailsService } from 'src/api/users/contract-details/contract-details.service';
import { ContractType } from 'src/entities/contract-type.entity';
import { XeroLogTemplates } from 'src/entities/xero-log-templates.entity';
import { RetentionReversalFunctions } from 'src/api/users/banking/payments/retentions/retention-reversal-functions';
import { XeroInvoicesService } from '../integrations/xero/invoicesAndBills/xero-invoices.service';
import { XeroPaymentsService } from '../integrations/xero/payments/xero-payments.service';
import { XeroManualJournalService } from '../integrations/xero/manualJournals/xero-manual-journal.service';
import { XeroRetentionJournals } from 'src/entities/xero-retention-journals.entity';
import { ClientSupplierProjectXeroAccountCodes } from 'src/entities/client-supplier-project-xero-account-codes.entity';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { XeroWaitQueueService } from './waitQueue/webhookWait.service';
import { XeroWaitQueueWorker } from './waitQueue/webhookWait.worker';
import { XeroWaitQueueEvent } from './waitQueue/webhookWait.QueueEvents';
import { StripeCoupons } from 'src/entities/subscription-coupon.entity';
import { XeroResolver } from '../integrations/xero/xero.resolver';
import { CompanyCouponDetails } from 'src/entities/company-coupon-details.entity';
import { AuthService } from 'src/api/auth/auth-guard/auth.service';
import { XeroWebhookGraphQLResolver } from './webhook-graphql.resolver';
import { XeroWebhookQueueConsumer } from './webhook-queue-consumer.service';
import {
  XeroSyncRecoveryService,
  XERO_SYNC_RECOVERY_QUEUE,
} from './recoveryQueue/xeroSyncRecovery.service';
import { XeroSyncRecoveryWorker } from './recoveryQueue/xeroSyncRecovery.worker';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'xero-refresh-token',
    }),
    BullModule.registerQueue({
      name: 'xero-wait-queue',
    }),
    BullModule.registerQueue({
      name: 'mailQueue',
    }),
    BullModule.registerQueue({
      name: XERO_SYNC_RECOVERY_QUEUE,
    }),
    TypeOrmModule.forFeature([
      XeroContactDetails,
      XeroIntegrationDetails,
      IntegrationDetails,
      XeroSyncLogs,
      XeroLogTemplates,
      ClientSuppliersDetails,
      XeroInvoicesBills,
      XeroRetentionJournals,
      ClientSupplierProjectXeroAccountCodes,
      XeroContractDetails,
      XeroProjectDetails,
      XeroPayments,
      PaymentClaims,
      PaymentClaimInvoices,
      PaymentDetails,
      VariationDetails,
      BankAccounts,
      ProjectDetails,
      ContractDetails,
      ContractType,
      RetentionDetails,
      JournalEntries,
      JournalType,
      SubPayments,
      HolidayDetails,
      NoticeDetails,
      NoticeMail,
      UiStatusAndActionButtons,
      ActivityLogNew,
      ActivityLogTemplates,
      UserDetails,
      CompanyDetails,
      AdminDetails,
      CompanyUserRoles,
      XeroBankAccountDetails,
      NoticeTemplates,
      EmailTemplates,
      FileAttachments,
      BlogResource,
      CmtyDiscussionsIdeas,
      CmtyAnswersComments,
      AuditReport,
      SubscriptionDetails,
      SubscriptionPlanItems,
      SubscriptionPlanDetails,
      SubscriptionPricingPlan,
      SubscriptionTransaction,
      BankStatements,
      FinancialInstitutionsDetails,
      RetentionSummaryDetails,
      TransactionDetails,
      GenerateABAFileHistory,
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
      StripeCoupons,
      CompanyCouponDetails,
    ]),
  ],
  controllers: [XeroWebhookResolver],
  providers: [
    AuthService,
    XeroWebhookService,
    XeroWebhookGraphQLResolver,
    XeroWebhookQueueConsumer,
    XeroResolver,
    XeroService,
    XeroContactsService,
    PaymentClaimsService,
    PaymentsService,
    StatusService,
    ActivityLogService,
    NoticeGenDocService,
    FileUploadService,
    ImageService,
    PaymentClaimsValidator,
    RetentionStatusFunctions,
    RetentionProgressionFunctions,
    CompliancesService,
    CompliancePTAFunctions,
    ComplianceRTAFunctions,
    PtContentsService,
    EmailService,
    XeroRefreshTokenService,
    NoticesService,
    NoticesValidator,
    JwtInternalService,
    PaymentGatewayService,
    ClientSuppliersDetailsService,
    ContractDetailsService,
    RetentionReversalFunctions,
    XeroInvoicesService,
    XeroPaymentsService,
    XeroManualJournalService,
    EmailQueueProducer,
    XeroWaitQueueService,
    XeroWaitQueueWorker,
    XeroWaitQueueEvent,
    XeroSyncRecoveryService,
    XeroSyncRecoveryWorker,
  ],
  exports: [XeroSyncRecoveryService],
})
export class XeroWebhookModule {}
