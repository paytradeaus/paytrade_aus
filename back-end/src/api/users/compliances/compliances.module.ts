import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserDetails } from 'src/entities/user-details.entity';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { VariationDetails } from 'src/entities/variation-details.entity';
import { ContractType } from 'src/entities/contract-type.entity';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import { BankAccounts, PaymentClaims } from 'src/entities/banking.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { CompliancesResolver } from './compliances.resolver';
import { CompliancesService } from './compliances.service';
import { CompliancePTAFunctions } from './functions/pta-functions';
import { ComplianceRTAFunctions } from './functions/rta-functions';
import {
  RtaCompliances,
  PtaCompliances,
  ComplianceChecks,
  ComplianceSettings,
  ComplianceOfProjects,
} from 'src/entities/compliances.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { ReconciliationReport } from 'src/entities/reconciliation-report.entity';
import { AuditReport } from 'src/entities/audit-report.entity';
import { TransactionDetails } from 'src/entities/transaction-details.entity';
import { SubPayments } from 'src/entities/sub-payments.entity';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import { PtContentsService } from 'src/api/admin/pt-contents/pt-contents.service';
import { EmailService } from 'src/libs/@email-services/email.service';
import { Contents } from 'src/entities/admin-contents.entity';
import { MasterTypes } from 'src/entities/master-types.entity';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { BlogResource } from 'src/entities/admin-blogs-resources.entity';
import { BlogComments } from 'src/entities/admin-blog-comments.entity';
import { ComplianceCronService } from './compliance.cron.services';
import {
  ComplianceCheckpoint,
  ComplianceRule,
} from 'src/entities/compliance-details-pro-acc.entity';
import { HolidayDetails } from 'src/entities/holiday-details.entity';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { BullModule } from '@nestjs/bullmq';
import { ComplianceRefreshModule } from './compliance-refresh.module';
import { ComplianceRefreshConsumer } from './compliance-refresh.consumer';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserDetails,
      CompanyDetails,
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
      RtaCompliances,
      PtaCompliances,
      ComplianceChecks,
      NoticeDetails,
      ReconciliationReport,
      AuditReport,
      TransactionDetails,
      SubPayments,
      ComplianceSettings,
      Contents,
      MasterTypes,
      EmailTemplates,
      BlogResource,
      BlogComments,
      ComplianceOfProjects,
      ComplianceCheckpoint,
      ComplianceRule,
      HolidayDetails,
    ]),
    BullModule.registerQueue({
      name: 'mailQueue',
    }),
    // Task #297 — debounced compliance cache refresh queue + producer
    // live in their own module so write-path sibling modules can
    // import it without creating a circular dep on CompliancesModule.
    ComplianceRefreshModule,
  ],
  providers: [
    CompliancesResolver,
    CompliancesService,
    ComplianceCronService,
    CompliancePTAFunctions,
    PtContentsService,
    EmailService,
    ComplianceRTAFunctions,
    PtContentsService,
    EmailQueueProducer,
    // Task #297 — refresh worker stays here because it needs to call
    // CompliancesService.refreshProjectComplianceCache (forwardRef).
    ComplianceRefreshConsumer,
  ],
  exports: [CompliancesService, ComplianceRefreshModule],
})
export class CompliancesModule {}
