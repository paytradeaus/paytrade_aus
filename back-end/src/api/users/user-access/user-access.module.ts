import { Module } from '@nestjs/common';
import { UserAccessService } from './user-access.service';
import { UserAccessResolver } from './user-access.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserDetails } from 'src/entities/user-details.entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { Invitations } from 'src/entities/invitations.entity';
import { EmailService } from 'src/libs/@email-services/email.service';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { Contents } from 'src/entities/admin-contents.entity';
import { PtContentsService } from 'src/api/admin/pt-contents/pt-contents.service';
import { MasterTypes } from 'src/entities/master-types.entity';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { BlogResource } from 'src/entities/admin-blogs-resources.entity';
import { BlogComments } from 'src/entities/admin-blog-comments.entity';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import { BankAccounts } from 'src/entities/banking.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { PaymentGatewayService } from 'src/api/common/payment-gateway/payment-gateway.service';
import { SubscriptionPlanItems } from 'src/entities/subscription-plan-items.entity';
import { SubscriptionPlanDetails } from 'src/entities/subscription-plan-details.entity';
import { SubscriptionPricingPlan } from 'src/entities/subscription-pricing-plan.entity';
import { SubscriptionTransaction } from 'src/entities/subscription-transactions.entity';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { BullModule } from '@nestjs/bullmq';
import { StripeCoupons } from 'src/entities/subscription-coupon.entity';
import { CompanyCouponDetails } from 'src/entities/company-coupon-details.entity';
import { IntegrationDetails } from 'src/entities/integration-details.entity';
// import { EmailQueueProducer } from 'src/libs/@email-services/email-queuers/producer';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserDetails,
      CompanyDetails,
      CompanyUserRoles,
      Invitations,
      AdminDetails,
      MasterTypes,
      EmailTemplates,
      Contents,
      BlogResource,
      BlogComments,
      FileAttachments,
      ActivityLogNew,
      ActivityLogTemplates,
      SubscriptionDetails,
      SubscriptionPlanDetails,
      SubscriptionPricingPlan,
      SubscriptionPlanItems,
      SubscriptionTransaction,
      BankAccounts,
      NoticeDetails,
      StripeCoupons,
      CompanyCouponDetails,
      IntegrationDetails,
    ]),
    BullModule.registerQueue({
      name: 'mailQueue',
    }),
  ],
  providers: [
    JwtInternalService,
    UserAccessResolver,
    UserAccessService,
    EmailService,
    PtContentsService,
    ActivityLogService,
    PaymentGatewayService,
    EmailQueueProducer,
  ],
  exports: [UserAccessService],
})
export class UserAccessModule {}
