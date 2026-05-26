import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  BankAccounts,
  bankingEntitiesToInject,
} from 'src/entities/banking.entity';
import { BankAccountsResolver } from './bank-accounts/bank-accounts.resolver';
import { BankAccountsService } from './bank-accounts/bank-accounts.service';
import { UserDetails } from 'src/entities/user-details.entity';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { BankStatementsService } from './bank-statements/bank-statements.service';
import { BankStatementsResolver } from './bank-statements/bank-statements.resolver';
import { TransactionsResolver } from './transactions/transactions.resolver';
import { TransactionsService } from './transactions/transactions.service';
import { JournalsService } from './journals/journals.service';
import { JournalsResolver } from './journals/journals.resolver';
import { PaymentsResolver } from './payments/payments.resolver';
import { PaymentsService } from './payments/payments.service';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { BankAccountsValidator } from './bank-accounts/bank-accounts.validator';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { BankStatementsValidator } from './bank-statements/bank-statements.validator';
import { InvoiceDetailsOfAPaymentClaimValidator } from './payment-claims/invoice-details/invoice-details.validator';
import { PaymentClaimsResolver } from './payment-claims/payment-claims.resolver';
import { PaymentClaimsService } from './payment-claims/payment-claims.service';
import { PaymentClaimsValidator } from './payment-claims/payment-claims.validator';
import { PaymentsValidator } from './payments/payments.validator';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import {
  TempSaveTransactions,
  TransactionDetails,
} from 'src/entities/transaction-details.entity';
import { VariationDetails } from 'src/entities/variation-details.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { SubPayments } from 'src/entities/sub-payments.entity';
import { RetentionDetails } from 'src/entities/retention-details.entity';
import { RetentionSummaryDetails } from 'src/entities/retention-summary.entity';
import { RetentionProgressionFunctions } from './payments/retentions/retention-progression-functions';
import { StatusService } from './ui-status.service';
import { UiStatusAndActionButtons } from 'src/entities/ui-status-and-action-buttons.entity';
import { JournalEntries } from 'src/entities/journal-entries.entity';
import { JournalType } from 'src/entities/journal-type.entity';
import { RetentionReversalFunctions } from './payments/retentions/retention-reversal-functions';
import { RetentionStatusFunctions } from './payments/retentions/retention-status-functions';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { ReconciliationReport } from 'src/entities/reconciliation-report.entity';
import { AuditReport } from 'src/entities/audit-report.entity';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import { XeroBankAccountDetails } from 'src/entities/xero-bank-account-details.entity';
import { XeroProjectDetails } from 'src/entities/xero-project-details.entity';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';
import { XeroContactDetails } from 'src/entities/xero-contact-details.entity';
import { XeroService } from 'src/api/common/integrations/xero/xero.service';
import { XeroContractDetails } from 'src/entities/xero-contract-details.entity';
import { FinancialInstitutionsDetails } from 'src/entities/financial-institution-deatils.entity';
import { FileUploadService } from '../file-upload/file-upload.service';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import { BlogResource } from 'src/entities/admin-blogs-resources.entity';
import { NoticeTemplates } from 'src/entities/notices-templates.entity';
import { CmtyDiscussionsIdeas } from 'src/entities/cmty-discussion-idea.entity';
import { CmtyAnswersComments } from 'src/entities/cmty-answers-comments.entity';
import { CmtyVoteLikesFlags } from 'src/entities/cmty-vote-likes-flags.entity';
import { XeroAccountsService } from 'src/api/common/integrations/xero/accounts/xero-accounts.service';
import { IntegrationDetails } from 'src/entities/integration-details.entity';
import { XeroSyncLogs } from 'src/entities/xero-sync-logs.entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { HolidayDetails } from 'src/entities/holiday-details.entity';
import { XeroInvoicesService } from 'src/api/common/integrations/xero/invoicesAndBills/xero-invoices.service';
import { XeroInvoicesBills } from 'src/entities/xero-invoices-bills.entity';
import { XeroManualJournalService } from 'src/api/common/integrations/xero/manualJournals/xero-manual-journal.service';
import { XeroRetentionJournals } from 'src/entities/xero-retention-journals.entity';
import { ClientSupplierProjectXeroAccountCodes } from 'src/entities/client-supplier-project-xero-account-codes.entity';
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
import { Contents } from 'src/entities/admin-contents.entity';
import { MasterTypes } from 'src/entities/master-types.entity';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { BlogComments } from 'src/entities/admin-blog-comments.entity';
import { XeroPaymentsService } from 'src/api/common/integrations/xero/payments/xero-payments.service';
import { XeroPayments } from 'src/entities/xero-payments.entity';
import { GenerateABAFileHistory } from 'src/entities/generate-aba-history.entity';
import { NoticeGenDocService } from '../notices/notice-gen-doc.service';
import { ImageService } from '../notices/write-to-image/write-to-image.service';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { BullModule } from '@nestjs/bullmq';
import { XeroRefreshTokenService } from 'src/api/common/integrations/xero/refreshToken/xeroRefreshToken.service';
import { PaymentGatewayService } from 'src/api/common/payment-gateway/payment-gateway.service';
import { SubscriptionPlanDetails } from 'src/entities/subscription-plan-details.entity';
import { SubscriptionPlanItems } from 'src/entities/subscription-plan-items.entity';
import { SubscriptionPricingPlan } from 'src/entities/subscription-pricing-plan.entity';
import { SubscriptionTransaction } from 'src/entities/subscription-transactions.entity';
import { NoticesService } from '../notices/notices.service';
import { NoticesValidator } from '../notices/notices.validator';
import { NoticeMail } from 'src/entities/notice-mail.enitity';
import { ContractDetailsService } from '../contract-details/contract-details.service';
import { ContractType } from 'src/entities/contract-type.entity';
import { XeroModule } from 'src/api/common/integrations/xero/xero.module';
import { XeroLogTemplates } from 'src/entities/xero-log-templates.entity';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { StripeCoupons } from 'src/entities/subscription-coupon.entity';
import { CompanyCouponDetails } from 'src/entities/company-coupon-details.entity';
import { XeroSyncRecoveryService } from 'src/api/common/xero-webhooks/recoveryQueue/xeroSyncRecovery.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'xero-refresh-token',
    }),
    BullModule.registerQueue({
      name: 'mailQueue',
    }),
    BullModule.registerQueue({
      name: 'xero-sync-recovery',
    }),
    TypeOrmModule.forFeature([
      UserDetails,
      CompanyUserRoles,
      AdminDetails,
      CompanyDetails,
      ProjectDetails,
      VariationDetails,
      ...bankingEntitiesToInject,
      PaymentDetails,
      SubPayments,
      ClientSuppliersDetails,
      ContractDetails,
      ContractType,
      TransactionDetails,
      TempSaveTransactions,
      RetentionDetails,
      RetentionSummaryDetails,
      UiStatusAndActionButtons,
      JournalType,
      JournalEntries,
      NoticeDetails,
      ReconciliationReport,
      AuditReport,
      ActivityLogNew,
      ActivityLogTemplates,
      XeroBankAccountDetails,
      XeroProjectDetails,
      XeroIntegrationDetails,
      XeroContactDetails,
      XeroContractDetails,
      XeroInvoicesBills,
      XeroRetentionJournals,
      ClientSupplierProjectXeroAccountCodes,
      XeroPayments,
      IntegrationDetails,
      XeroSyncLogs,
      XeroLogTemplates,
      FinancialInstitutionsDetails,
      FileAttachments,
      BlogResource,
      NoticeTemplates,
      NoticeMail,
      CmtyDiscussionsIdeas,
      CmtyAnswersComments,
      CmtyVoteLikesFlags,
      HolidayDetails,
      ComplianceChecks,
      PtaCompliances,
      RtaCompliances,
      ComplianceOfProjects,
      ComplianceCheckpoint,
      ComplianceRule,
      ComplianceSettings,
      Contents,
      MasterTypes,
      EmailTemplates,
      BlogComments,
      GenerateABAFileHistory,
      SubscriptionDetails,
      SubscriptionPlanDetails,
      SubscriptionPricingPlan,
      SubscriptionPlanItems,
      SubscriptionTransaction,
      StripeCoupons,
      CompanyCouponDetails,
    ]),
  ],
  providers: [
    BankAccountsResolver,
    BankAccountsService,
    XeroSyncRecoveryService,
    BankStatementsResolver,
    BankStatementsService,
    TransactionsResolver,
    TransactionsService,
    JournalsResolver,
    JournalsService,
    PaymentsResolver,
    PaymentsService,
    PaymentsValidator,
    JwtInternalService,
    BankAccountsValidator,
    BankStatementsValidator,
    InvoiceDetailsOfAPaymentClaimValidator,
    PaymentClaimsResolver,
    PaymentClaimsService,
    PaymentClaimsValidator,
    RetentionProgressionFunctions,
    RetentionReversalFunctions,
    RetentionStatusFunctions,
    StatusService,
    ActivityLogService,
    BankAccounts,
    NoticeDetails,
    XeroService,
    FileUploadService,
    XeroAccountsService,
    XeroInvoicesService,
    XeroManualJournalService,
    XeroPaymentsService,
    CompliancesService,
    CompliancePTAFunctions,
    ComplianceRTAFunctions,
    PtContentsService,
    EmailService,
    NoticeGenDocService,
    ImageService,
    XeroRefreshTokenService,
    PaymentGatewayService,
    NoticesService,
    NoticesValidator,
    // ContractDetailsService,
    EmailQueueProducer,
  ],
  exports: [],
})
export class BankingModule {}
