import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailService } from 'src/libs/@email-services/email.service';
import { AuthService } from 'src/api/auth/auth-guard/auth.service';
import { UserDetails } from 'src/entities/user-details.entity';
import { EmailGenerator } from 'src/libs/@email-services/email-template-generators/email-generators';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminDashboardResolver } from './admin-dashboard.resolver';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { ReconciliationReport } from 'src/entities/reconciliation-report.entity';
import { SubscriptionTransaction } from 'src/entities/subscription-transactions.entity';
import { CompliancesService } from 'src/api/users/compliances/compliances.service';
import {
  BankAccounts,
  BankStatements,
  PaymentClaims,
} from 'src/entities/banking.entity';
import {
  ComplianceChecks,
  ComplianceOfProjects,
  ComplianceSettings,
  PtaCompliances,
  RtaCompliances,
} from 'src/entities/compliances.entity';
import { CompliancePTAFunctions } from 'src/api/users/compliances/functions/pta-functions';
import { ComplianceRTAFunctions } from 'src/api/users/compliances/functions/rta-functions';
import { VariationDetails } from 'src/entities/variation-details.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { JournalsService } from 'src/api/users/banking/journals/journals.service';
import { JournalEntries } from 'src/entities/journal-entries.entity';
import { AuditReport } from 'src/entities/audit-report.entity';
import { TransactionDetails } from 'src/entities/transaction-details.entity';
import { SubPayments } from 'src/entities/sub-payments.entity';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { PtContentsService } from '../pt-contents/pt-contents.service';
import { Contents } from 'src/entities/admin-contents.entity';
import { MasterTypes } from 'src/entities/master-types.entity';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { BlogResource } from 'src/entities/admin-blogs-resources.entity';
import { BlogComments } from 'src/entities/admin-blog-comments.entity';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import {
  ComplianceCheckpoint,
  ComplianceRule,
} from 'src/entities/compliance-details-pro-acc.entity';
import { HolidayDetails } from 'src/entities/holiday-details.entity';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { BullModule } from '@nestjs/bullmq';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserDetails,
      CompanyDetails,
      ProjectDetails,
      AdminDetails,
      CompanyUserRoles,
      ReconciliationReport,
      SubscriptionTransaction,
      BankAccounts,
      ComplianceChecks,
      RtaCompliances,
      PtaCompliances,
      VariationDetails,
      ContractDetails,
      PaymentDetails,
      NoticeDetails,
      JournalEntries,
      BankStatements,
      AuditReport,
      TransactionDetails,
      SubPayments,
      ComplianceSettings,
      PaymentClaims,
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
      HolidayDetails,
    ]),
    BullModule.registerQueue({
      name: 'mailQueue',
    }),
  ],
  providers: [
    JwtInternalService,
    AdminDashboardService,
    AdminDashboardResolver,
    EmailGenerator,
    EmailService,
    AuthService,
    CompliancesService,
    CompliancePTAFunctions,
    ComplianceRTAFunctions,
    JournalsService,
    PtContentsService,
    EmailQueueProducer,
  ],
  exports: [AdminDashboardService],
})
export class AdminDashboardModule {}
