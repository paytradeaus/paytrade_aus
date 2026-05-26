import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsService } from './projects.service';
import { ProjectsResolver } from './projects.resolver';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { BankAccounts, PaymentClaims } from 'src/entities/banking.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { CompliancesService } from '../compliances/compliances.service';
import { ComplianceRefreshModule } from '../compliances/compliance-refresh.module';
import {
  ComplianceChecks,
  ComplianceOfProjects,
  ComplianceSettings,
  PtaCompliances,
  RtaCompliances,
} from 'src/entities/compliances.entity';
import { CompliancePTAFunctions } from '../compliances/functions/pta-functions';
import { ComplianceRTAFunctions } from '../compliances/functions/rta-functions';
import { VariationDetails } from 'src/entities/variation-details.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { ReconciliationReport } from 'src/entities/reconciliation-report.entity';
import { AuditReport } from 'src/entities/audit-report.entity';
import { TransactionDetails } from 'src/entities/transaction-details.entity';
import { SubPayments } from 'src/entities/sub-payments.entity';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import { PtContentsService } from 'src/api/admin/pt-contents/pt-contents.service';
import { EmailService } from 'src/libs/@email-services/email.service';
import { Contents } from 'src/entities/admin-contents.entity';
import { MasterTypes } from 'src/entities/master-types.entity';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { BlogResource } from 'src/entities/admin-blogs-resources.entity';
import { BlogComments } from 'src/entities/admin-blog-comments.entity';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import { XeroService } from 'src/api/common/integrations/xero/xero.service';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';
import { ClientSupplierProjectXeroAccountCodes } from 'src/entities/client-supplier-project-xero-account-codes.entity';
import { XeroContactDetails } from 'src/entities/xero-contact-details.entity';
import { XeroBankAccountDetails } from 'src/entities/xero-bank-account-details.entity';
import { XeroProjectDetails } from 'src/entities/xero-project-details.entity';
import { XeroContractDetails } from 'src/entities/xero-contract-details.entity';
import { XeroProjectsService } from 'src/api/common/integrations/xero/projects/xero-projects.service';
import { IntegrationDetails } from 'src/entities/integration-details.entity';
import { XeroSyncLogs } from 'src/entities/xero-sync-logs.entity';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import {
  ComplianceCheckpoint,
  ComplianceRule,
} from 'src/entities/compliance-details-pro-acc.entity';
import { HolidayDetails } from 'src/entities/holiday-details.entity';
import { BullModule } from '@nestjs/bullmq';
import { XeroRefreshTokenService } from 'src/api/common/integrations/xero/refreshToken/xeroRefreshToken.service';
import { PaymentGatewayService } from 'src/api/common/payment-gateway/payment-gateway.service';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { SubscriptionPlanDetails } from 'src/entities/subscription-plan-details.entity';
import { SubscriptionPricingPlan } from 'src/entities/subscription-pricing-plan.entity';
import { SubscriptionPlanItems } from 'src/entities/subscription-plan-items.entity';
import { SubscriptionTransaction } from 'src/entities/subscription-transactions.entity';
import { XeroLogTemplates } from 'src/entities/xero-log-templates.entity';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { StripeCoupons } from 'src/entities/subscription-coupon.entity';
import { CompanyCouponDetails } from 'src/entities/company-coupon-details.entity';

@Module({
  imports: [
    // Task #297 — wires ComplianceRefreshProducer into the locally
    // provided CompliancesService so project-side write paths can
    // self-heal the compliance cache.
    ComplianceRefreshModule,
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
      ActivityLogNew,
      ActivityLogTemplates,
      ContractDetails,
      PaymentClaims,
      PaymentDetails,
      BankAccounts,
      ComplianceChecks,
      PtaCompliances,
      RtaCompliances,
      VariationDetails,
      NoticeDetails,
      ReconciliationReport,
      AuditReport,
      TransactionDetails,
      SubPayments,
      ComplianceSettings,
      ClientSuppliersDetails,
      Contents,
      MasterTypes,
      EmailTemplates,
      BlogResource,
      BlogComments,
      FileAttachments,
      ComplianceOfProjects,
      ComplianceCheckpoint,
      ComplianceRule,
      XeroIntegrationDetails,
      ClientSupplierProjectXeroAccountCodes,
      XeroContactDetails,
      XeroBankAccountDetails,
      XeroProjectDetails,
      XeroContractDetails,
      IntegrationDetails,
      XeroSyncLogs,
      XeroLogTemplates,
      HolidayDetails,
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
    JwtInternalService,
    ProjectsResolver,
    ProjectsService,
    ActivityLogService,
    CompliancesService,
    CompliancePTAFunctions,
    ComplianceRTAFunctions,
    PtContentsService,
    EmailService,
    XeroService,
    XeroProjectsService,
    XeroRefreshTokenService,
    PaymentGatewayService,
    EmailQueueProducer,
  ],
  exports: [ProjectsService],
})
export class ProjectsModule {}
