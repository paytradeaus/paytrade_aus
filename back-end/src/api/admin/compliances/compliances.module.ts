import { Module } from '@nestjs/common';
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
import {
  RtaCompliances,
  PtaCompliances,
  ComplianceChecks,
  ComplianceSettings,
  ComplianceOfProjects,
} from 'src/entities/compliances.entity';
import { AdminCompliancesResolver } from './compliances.resolver';
import { AdminCompliancesService } from './compliances.service';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import { CompliancesService } from 'src/api/users/compliances/compliances.service';
import {
  ComplianceCheckpoint,
  ComplianceRule,
} from 'src/entities/compliance-details-pro-acc.entity';
import { CompliancePTAFunctions } from 'src/api/users/compliances/functions/pta-functions';
import { ComplianceRTAFunctions } from 'src/api/users/compliances/functions/rta-functions';
import { PtContentsService } from '../pt-contents/pt-contents.service';
import { EmailService } from 'src/libs/@email-services/email.service';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { ReconciliationReport } from 'src/entities/reconciliation-report.entity';
import { AuditReport } from 'src/entities/audit-report.entity';
import { TransactionDetails } from 'src/entities/transaction-details.entity';
import { SubPayments } from 'src/entities/sub-payments.entity';
import { Contents } from 'src/entities/admin-contents.entity';
import { MasterTypes } from 'src/entities/master-types.entity';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { BlogResource } from 'src/entities/admin-blogs-resources.entity';
import { BlogComments } from 'src/entities/admin-blog-comments.entity';
import { HolidayDetails } from 'src/entities/holiday-details.entity';
import { ExportDataGateway } from 'src/api/common/export-data/pdf.gateway';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { BullModule } from '@nestjs/bullmq';

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
      ComplianceSettings,
      ComplianceOfProjects,
      ComplianceCheckpoint,
      ComplianceChecks,
      ComplianceRule,
      NoticeDetails,
      ReconciliationReport,
      AuditReport,
      TransactionDetails,
      SubPayments,
      Contents,
      MasterTypes,
      EmailTemplates,
      BlogResource,
      BlogComments,
      HolidayDetails,
    ]),
    BullModule.registerQueue({
      name: 'mailQueue',
    }),
  ],
  providers: [
    AdminCompliancesResolver,
    AdminCompliancesService,
    CompliancesService,
    ExportDataGateway,
    CompliancePTAFunctions,
    ComplianceRTAFunctions,
    PtContentsService,
    EmailService,
    EmailQueueProducer,
  ],
  exports: [AdminCompliancesService],
})
export class AdminCompliancesModule {}
