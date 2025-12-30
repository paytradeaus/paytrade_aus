import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportDataResolver } from './export-data.resolver';
import { ExportDataService } from './export-data.service';
import { ExportDataController } from './export-data.controller';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { VariationDetails } from 'src/entities/variation-details.entity';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import {
  BankAccounts,
  BankStatements,
  PaymentClaims,
} from 'src/entities/banking.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { TransactionDetails } from 'src/entities/transaction-details.entity';
import { RetentionDetails } from 'src/entities/retention-details.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { SubPayments } from 'src/entities/sub-payments.entity';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { ReconciliationReport } from 'src/entities/reconciliation-report.entity';
import {
  ComplianceChecks,
  ComplianceOfProjects,
  ComplianceSettings,
  PtaCompliances,
  RtaCompliances,
} from 'src/entities/compliances.entity';
import { ComplianceRTAFunctions } from 'src/api/users/compliances/functions/rta-functions';
import { CompliancePTAFunctions } from 'src/api/users/compliances/functions/pta-functions';
import { AuditReport } from 'src/entities/audit-report.entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { SubscriptionPlanDetails } from 'src/entities/subscription-plan-details.entity';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { SubscriptionPricingPlan } from 'src/entities/subscription-pricing-plan.entity';
import { SubscriptionPlanItems } from 'src/entities/subscription-plan-items.entity';
import { SubscriptionItems } from 'src/entities/subscription-items.entity';
import { DummyTable } from 'src/entities/dummy-table.entity';
import { SubscriptionTransaction } from 'src/entities/subscription-transactions.entity';
import { JournalEntries } from 'src/entities/journal-entries.entity';
import { ContactSubmissions } from 'src/entities/contact-submissions.entity';
import { Contents } from 'src/entities/admin-contents.entity';
import { FAQ } from 'src/entities/admin-faq.entity';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { BlogResource } from 'src/entities/admin-blogs-resources.entity';
import { AdminGroupDetails } from 'src/entities/admin-group-details.entity';
import { JournalsService } from 'src/api/users/banking/journals/journals.service';
import { CompliancesService } from 'src/api/users/compliances/compliances.service';
import { PtContentsService } from 'src/api/admin/pt-contents/pt-contents.service';
import { EmailService } from 'src/libs/@email-services/email.service';
import { MasterTypes } from 'src/entities/master-types.entity';
import { BlogComments } from 'src/entities/admin-blog-comments.entity';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import { ExportDataGateway } from './pdf.gateway';
import { PdfTemplates } from 'src/entities/pdf-template.entity';
import { HolidayDetails } from 'src/entities/holiday-details.entity';
import {
  ComplianceCheckpoint,
  ComplianceRule,
} from 'src/entities/compliance-details-pro-acc.entity';
import { AuditReportExportDataService } from './audit-report-export-data.service';
import { GenerateABAFileHistory } from 'src/entities/generate-aba-history.entity';
import { PaymentGatewayService } from '../payment-gateway/payment-gateway.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { BullModule } from '@nestjs/bullmq';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { StripeCoupons } from 'src/entities/subscription-coupon.entity';
import { CompanyCouponDetails } from 'src/entities/company-coupon-details.entity';
import { IntegrationDetails } from 'src/entities/integration-details.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectDetails,
      ClientSuppliersDetails,
      ContractDetails,
      VariationDetails,
      PaymentClaims,
      NoticeDetails,
      BankAccounts,
      TransactionDetails,
      RetentionDetails,
      CompanyDetails,
      PaymentDetails,
      SubPayments,
      ActivityLogNew,
      AdminDetails,
      UserDetails,
      ActivityLogTemplates,
      BankStatements,
      ReconciliationReport,
      ComplianceChecks,
      RtaCompliances,
      PtaCompliances,
      AuditReport,
      ComplianceSettings,
      CompanyUserRoles,
      SubscriptionDetails,
      SubscriptionPlanDetails,
      SubscriptionPricingPlan,
      SubscriptionPlanItems,
      SubscriptionItems,
      DummyTable,
      SubscriptionTransaction,
      JournalEntries,
      ContactSubmissions,
      Contents,
      FAQ,
      EmailTemplates,
      BlogResource,
      AdminGroupDetails,
      MasterTypes,
      BlogComments,
      FileAttachments,
      ComplianceOfProjects,
      ComplianceCheckpoint,
      ComplianceRule,
      PdfTemplates,
      HolidayDetails,
      GenerateABAFileHistory,
      StripeCoupons,
      CompanyCouponDetails,
      IntegrationDetails,
    ]),
    BullModule.registerQueue({
      name: 'mailQueue',
    }),
  ],
  controllers: [ExportDataController],
  providers: [
    ExportDataResolver,
    ExportDataService,
    AuditReportExportDataService,
    JwtInternalService,
    ComplianceRTAFunctions,
    CompliancePTAFunctions,
    JournalsService,
    CompliancesService,
    PtContentsService,
    EmailService,
    ExportDataGateway,
    PaymentGatewayService,
    ActivityLogService,
    EmailQueueProducer,
  ],
  exports: [ExportDataService],
})
export class ExportDataModule {}
