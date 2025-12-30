import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';
import { XeroContactDetails } from 'src/entities/xero-contact-details.entity';
import { XeroProjectDetails } from 'src/entities/xero-project-details.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { XeroBankAccountDetails } from 'src/entities/xero-bank-account-details.entity';
import { BankAccounts } from 'src/entities/banking.entity';
import { XeroContractDetails } from 'src/entities/xero-contract-details.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { IntegrationsResolver } from './common/integrations.resolver';
import { IntegrationsService } from './common/integrations.service';
import { IntegrationDetails } from 'src/entities/integration-details.entity';
import { XeroModule } from './xero/xero.module';
import { PtContentsService } from 'src/api/admin/pt-contents/pt-contents.service';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { EmailService } from 'src/libs/@email-services/email.service';
import { XeroSyncLogs } from 'src/entities/xero-sync-logs.entity';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { PaymentGatewayService } from '../payment-gateway/payment-gateway.service';
import { SubscriptionPlanItems } from 'src/entities/subscription-plan-items.entity';
import { SubscriptionPlanDetails } from 'src/entities/subscription-plan-details.entity';
import { SubscriptionPricingPlan } from 'src/entities/subscription-pricing-plan.entity';
import { SubscriptionTransaction } from 'src/entities/subscription-transactions.entity';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { BullModule } from '@nestjs/bullmq';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { StripeCoupons } from 'src/entities/subscription-coupon.entity';
import { CompanyCouponDetails } from 'src/entities/company-coupon-details.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IntegrationDetails,
      XeroIntegrationDetails,
      XeroContactDetails,
      XeroBankAccountDetails,
      XeroProjectDetails,
      XeroContractDetails,
      ProjectDetails,
      ClientSuppliersDetails,
      BankAccounts,
      ContractDetails,
      UserDetails,
      CompanyDetails,
      CompanyUserRoles,
      AdminDetails,
      EmailTemplates,
      XeroSyncLogs,
      SubscriptionDetails,
      SubscriptionPlanDetails,
      SubscriptionPricingPlan,
      SubscriptionPlanItems,
      SubscriptionTransaction,
      ActivityLogNew,
      ActivityLogTemplates,
      NoticeDetails,
      StripeCoupons,
      CompanyCouponDetails,
    ]),
    XeroModule,
    BullModule.registerQueue({
      name: 'mailQueue',
    }),
  ],
  providers: [
    JwtInternalService,
    IntegrationsService,
    EmailService,
    IntegrationsResolver,
    ActivityLogService,
    PaymentGatewayService,
    EmailQueueProducer,
  ],
})
export class IntegrationsModule {}
