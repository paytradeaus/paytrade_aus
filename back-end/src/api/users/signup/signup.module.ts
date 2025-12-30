import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SignupService } from './signup.service';
import { SignupResolver } from './signup.resolver';
import { UserDetails } from 'src/entities/user-details.entity';
import { AuthService } from 'src/api/auth/auth-guard/auth.service';
import { EmailService } from 'src/libs/@email-services/email.service';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { EmailVerificationDetails } from 'src/entities/email-verification-entity';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import { FileUploadService } from '../file-upload/file-upload.service';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { BlogResource } from 'src/entities/admin-blogs-resources.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { Invitations } from 'src/entities/invitations.entity';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { Contents } from 'src/entities/admin-contents.entity';
import { BlogComments } from 'src/entities/admin-blog-comments.entity';
import { PtContentsService } from 'src/api/admin/pt-contents/pt-contents.service';
import { MasterTypes } from 'src/entities/master-types.entity';
import { VariationDetails } from 'src/entities/variation-details.entity';
// import { EmailQueueProducer } from 'src/libs/@email-services/email-queuers/producer';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { NoticeTemplates } from 'src/entities/notices-templates.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { AuditReport } from 'src/entities/audit-report.entity';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { SubscriptionPlanDetails } from 'src/entities/subscription-plan-details.entity';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import {
  BankAccounts,
  BankStatements,
  PaymentClaims,
} from 'src/entities/banking.entity';
import { CmtyDiscussionsIdeas } from 'src/entities/cmty-discussion-idea.entity';
import { CmtyAnswersComments } from 'src/entities/cmty-answers-comments.entity';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserDetails,
      CompanyDetails,
      EmailVerificationDetails,
      CompanyUserRoles,
      FileAttachments,
      AdminDetails,
      EmailTemplates,
      BlogResource,
      ContractDetails,
      ActivityLogNew,
      ActivityLogTemplates,
      Invitations,
      Contents,
      MasterTypes,
      BlogComments,
      VariationDetails,
      PaymentDetails,
      NoticeTemplates,
      NoticeDetails,
      AuditReport,
      SubscriptionDetails,
      SubscriptionPlanDetails,
      BankAccounts,
      NoticeDetails,
      CmtyDiscussionsIdeas,
      CmtyAnswersComments,
      PaymentClaims,
      BankStatements,
    ]),
    BullModule.registerQueue({
      name: 'mailQueue',
    }),
  ],
  providers: [
    JwtInternalService,
    SignupResolver,
    SignupService,
    AuthService,
    EmailService,
    FileUploadService,
    ActivityLogService,
    PtContentsService,
    // EmailQueueProducer,
    EmailQueueProducer,
  ],
  exports: [SignupService],
})
export class SignupModule {}
