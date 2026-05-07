import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { join } from 'path';
import { AppService } from './app.service';
import { SignupModule } from './api/users/signup/signup.module';
import { AuthModule } from './api/auth/auth-guard/auth.module';
// import { dataSourceOptions } from 'db/data-source';
import { UserDetailsSubscriber } from './subscribers/user-details.subscriber';
import { FileUploadModule } from './api/users/file-upload/file-upload.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { CompanySubscriber } from './subscribers/company-details.subscriber';
import { CISRate } from './entities/cis-rate.entity';
import { AccountingSystem } from './entities/accounting-system.entity';
import { CompanyUserRoles } from './entities/company-user-roles.entity';
import { EmailVerificationDetails } from './entities/email-verification-entity';
import { PtAdminModule } from './api/admin/pt-admin/pt-admin.module';
import { PtGroupsModule } from './api/admin/pt-groups/pt-groups.module';
import { AdminDetails } from './entities/admin-details.entity';
import { AdminGroupDetails } from './entities/admin-group-details.entity';
import { AdminGroup } from './entities/admin-group.entity';
import { UserAccessModule } from './api/users/user-access/user-access.module';
import { AdminMenuDetails } from './entities/admin-menu-details.entity';
import { AdminGroupMenuPriv } from './entities/admin-group-menu-priv.entity';
import { Invitations } from './entities/invitations.entity';
import { PtAdminAccessModule } from './api/admin/pt-admin-access/pt-admin-access.module';
import { ActivityLogModule } from './api/common/activity-log/activity-log.module';
import { CommonApiModule } from './api/common/common-api/common-api.module';
import { ActivityLogTemplates } from './entities/activity-log-templates.entity';
import { PtFaqModule } from './api/admin/pt-faq/pt-faq.module';
import { FAQ } from './entities/admin-faq.entity';
import { MasterTypes } from './entities/master-types.entity';
import { Contents } from './entities/admin-contents.entity';
import { PtTextContentsModule } from './api/admin/pt-contents/pt-contents.module';
import { ProjectDetailsSubscriber } from './subscribers/project-details.subscriber';
import { ProjectDetails } from './entities/project-details.entity';
import { ProjectsModule } from './api/users/projects/projects.module';
import { ContactsModule } from './api/contacts/contacts.module';
import { ContactSubmissions } from './entities/contact-submissions.entity';
import { CommunicationEmails } from './entities/communication-emails.entity';
import { ClientSuppliersDetails } from './entities/client-suppliers-details.entity';
import { ClientSuppliersSubscriber } from './subscribers/client-suppliers-details.subscriber';
import { ClientSuppliersDetailsModule } from './api/users/client-suppliers-details/client-suppliers-details.module';
import { CommunicationManagementModule } from './api/admin/communication-management/communication-management.module';
import { BlogResource } from './entities/admin-blogs-resources.entity';
import { BlogComments } from './entities/admin-blog-comments.entity';
import { ContractDetails } from './entities/contract-details.entity';
import { ContractDetailsSubscriber } from './subscribers/contract-details.subscriber';
import { SubscriptionItems } from './entities/subscription-items.entity';
import { SubscriptionPlanItems } from './entities/subscription-plan-items.entity';
import { ContractDetailsModule } from './api/users/contract-details/contract-details.module';
import { PtSubscriptionModule } from './api/admin/pt-subscription/pt-subscription.module';
import { bankingEntitiesToInject } from './entities/banking.entity';
import { BankingModule } from './api/users/banking/banking.module';
import { PaytradeLoggerModule } from './libs/@loggers/logger.module';
import { VariationDetails } from './entities/variation-details.entity';
import { EmailQueuerLogs } from './entities/email-logs.entity';
import { VariationsModule } from './api/users/variations/variations.module';
import { ImportedCompanyExcel } from './entities/company-imported-excel.entity';
import { VariationDetailsSubscriber } from './subscribers/variation-details.subscriber';
import { FileAttachmentsModule } from './libs/@file-attachments/file-attachments.module';
import { PaymentGatewayModule } from './api/common/payment-gateway/payment-gateway.module';
import { AdminDetailsSubscriber } from './subscribers/admin-details.subscriber';
import { SubscriptionItemsSubscriber } from './subscribers/subscription-items.subscriber';
import { BankAccountsSubscriber } from './subscribers/bank-accounts.subscriber';
import { PaymentDetailsSubscriber } from './subscribers/payment-details.subscriber';
import { RetentionDetailsSubscriber } from './subscribers/retention-details.subscriber';
import { SubPaymentsSubscriber } from './subscribers/sub-payments.subscriber';
import { NoticesModule } from './api/users/notices/notices.module';
import { CompliancesModule } from './api/users/compliances/compliances.module';
import { NoticeMail } from './entities/notice-mail.enitity';
import { ReconciliationReportSubscriber } from './subscribers/reconciliation-report.subscriber';
import { AuditReportSubscriber } from './subscribers/audit-details.subscriber';
import { AdminCompliancesModule } from './api/admin/compliances/compliances.module';
import { SubscriptionPlanDetailsSubscriber } from './subscribers/plan-details.subscriber';
import { SubscriptionPricingPlanSubscriber } from './subscribers/price-plan.subscriber';
import { AdminDashboardModule } from './api/admin/dashboard/admin-dashboard.module';
import { SubscriptionDetailsSubscriber } from './subscribers/subscription-details.subscriber';
import { StripeWebhookModule } from './api/common/stripe-webhooks/webhook.module';
import { LoginAsUserModule } from './api/admin/login-as-user/login-as-user.module';
import { NoticeDetails } from './entities/notices-details.entity';
import { UserCombinationalFiltersModule } from './api/users/combinational-filters/combinational-filters.module';
import { AdminCombinationalFiltersModule } from './api/admin/combinational-filters/combinational-filters.module';
import { UserActivityLogModule } from './api/users/activity-logs/activity-log.module';
import { ApolloServerErrorCode } from '@apollo/server/errors';
import { BankStatementsSubscriber } from './subscribers/bank-statements.subscriber';
import { ExportDataService } from './api/common/export-data/export-data.service';
import { ExportDataModule } from './api/common/export-data/export-data.module';
import { CommunityModule } from './api/common/community/community.module';
import { IntegrationDetailsSubscriber } from './subscribers/integration-details.subscriber';
import { IntegrationsModule } from './api/common/integrations/integrations.module';
import { JwtInternalService } from './libs/@jwt-internal-services/jwt.internal.service';
import { XeroSyncLogsSubscriber } from './subscribers/xero-sync-logs.subscriber';
import { XeroWebhookModule } from './api/common/xero-webhooks/webhook.module';
import { BullModule } from '@nestjs/bullmq';
import { SupportWebhooksModule } from './api/common/support-webhooks/support-webhooks.module';
import { SupportModule } from './api/support/support.module';
import { EmailQueueModule } from './libs/@email-services/email-queue/email-queue.module';
import { ObjectStorageModule } from './libs/@object-storage';
import { DatabaseBackupModule } from './libs/@database-backup';
import { KeepAliveModule } from './libs/@keep-alive/keep-alive.module';
import { SeoKeywordsModule } from './api/admin/seo-keywords/seo-keywords.module';
import { CommunityBotModule } from './api/common/community-bot/community-bot.module';
import { AiSupportModule } from './api/common/ai-support/ai-support.module';
import { AdminMenuSeederModule } from './libs/@seeders/admin-menu-seeder.module';
import { ComplianceSeederModule } from './libs/@seeders/compliance-seeder.module';
import { XeroLogTemplatesSeederModule } from './libs/@seeders/xero-log-templates-seeder.module';
import { NoticeTemplatesSeederModule } from './libs/@seeders/notice-templates-seeder.module';
import { EmailTemplateUrlCleanupSeederModule } from './libs/@seeders/email-template-url-cleanup-seeder.module';
import { AbaGuidesSeederModule } from './libs/@seeders/aba-guides-seeder.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [
        // `environment.${process.env.NODE_ENV || 'dev'}.env`,
        'environment.dev.env',
        'environment.qa.env',
        'environment.prod.env',
      ],
    }),
    TypeOrmModule.forRoot(
      //dataSourceOptions
      {
        type: 'postgres',
        ...(process.env.DATABASE_URL
          ? { url: process.env.DATABASE_URL }
          : {
              host: process.env.DATABASE_HOST,
              port: parseInt(process.env.DATABASE_PORT, 10),
              username: process.env.DATABASE_USER,
              password: process.env.DATABASE_PASSWORD,
              database: process.env.DATABASE_NAME,
            }),
        entities: [
          'dist/**/*.entity{.ts,.js}',
          // UserDetails,
          // CompanyDetails,
          EmailVerificationDetails,
          NoticeMail,
          NoticeDetails,
          // EmailQueuerLogs,
          // CommunicationEmails,
          // CompanyUserRoles,
          // Settings,
          // FileAttachments,
          // EmailTemplates,
          // CISRate,
          // AccountingSystem,
          // Invitations,
          // AdminDetails,
          // AdminGroupDetails,
          // AdminGroup,
          // AdminMenuDetails,
          // AdminGroupMenuPriv,
          // ActivityLogTemplates,
          // ActivityLogNew,
          // ContactSubmissions,
          // FAQ,
          // MasterTypes,
          // Contents,
          // ProjectDetails,
          // ClientSuppliersDetails,
          // BlogResource,
          // BlogComments,
          // ContractDetails,
          // SubscriptionItems,
          // SubscriptionPlanItems,
          // VariationDetails,
          // ImportedCompanyExcel,
          // ...bankingEntitiesToInject,
        ],
        // autoLoadEntities: true,
        synchronize: process.env.NODE_ENV !== 'production',
        ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
        extra: {
          max: 5,
          connectionTimeoutMillis: 10000,
          idleTimeoutMillis: 30000,
          query_timeout: 30000,
        },
      },
    ),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), '/schema.gql'),
      context: ({ req, res }) => ({ req, res }),
      sortSchema: true,
      playground: false,
      introspection: true,
      csrfPrevention: false,
      plugins:
        process.env.NODE_ENV === 'production'
          ? []
          : [ApolloServerPluginLandingPageLocalDefault()],
      formatError: (error) => {
        if (error.extensions.code === ApolloServerErrorCode.BAD_USER_INPUT) {
          const message = error.message;
          // Extract the field name from the error message
          const requiredMatch = message.match(
            /Variable "\$(\w+)" of required type/,
          );
          const invalidMatch = message.match(
            /Variable "\$(\w+)" got invalid value/,
          );
          let errorMessage;
          if (requiredMatch && requiredMatch[1]) {
            errorMessage = `Please provide a required value for the field: ${requiredMatch[1]}.`;
          } else if (invalidMatch && invalidMatch[1]) {
            errorMessage = `Please provide a valid value for the field: ${invalidMatch[1]}.`;
          } else {
            errorMessage = error.message;
          }
          return { message: errorMessage };
        }
        return { message: error.message ? error.message : error };
      },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'assets'),
      serveRoot: '/assets',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    BullModule.forRoot({
      connection: process.env.REDIS_URL
        ? {
            url: process.env.REDIS_URL,
            tls: process.env.REDIS_URL.startsWith('rediss://')
              ? {}
              : undefined,
          }
        : {
            host: '127.0.0.1',
            port: 6379,
          },
    }),
    BullModule.registerQueue({
      name: 'xero-refresh-token',
    }),
    BullModule.registerQueue({
      name: 'mailQueue',
    }),
    AuthModule,
    IntegrationsModule, // Must be before FileUploadModule so XeroController routes take precedence
    ExportDataModule, // Must be before FileUploadModule so /files routes take precedence
    BankingModule,
    SignupModule,
    FileUploadModule,
    UserAccessModule,
    CommonApiModule,
    ActivityLogModule,
    PtAdminModule,
    PtGroupsModule,
    PtAdminAccessModule,
    CompliancesModule,
    PtFaqModule,
    PtTextContentsModule,
    ProjectsModule,
    PaytradeLoggerModule,
    ContactsModule,
    ClientSuppliersDetailsModule,
    CommunicationManagementModule,
    ContractDetailsModule,
    PtSubscriptionModule,
    // EmailWorkerModule,
    VariationsModule,
    FileAttachmentsModule,
    PaymentGatewayModule,
    NoticesModule,
    AdminCompliancesModule,
    AdminDashboardModule,
    StripeWebhookModule,
    XeroWebhookModule,
    LoginAsUserModule,
    UserCombinationalFiltersModule,
    AdminCombinationalFiltersModule,
    UserActivityLogModule,
    CommunityModule,
    SupportWebhooksModule,
    SupportModule,
    EmailQueueModule,
    ObjectStorageModule,
    DatabaseBackupModule,
    KeepAliveModule,
    SeoKeywordsModule,
    CommunityBotModule,
    AiSupportModule,
    AdminMenuSeederModule,
    ComplianceSeederModule,
    XeroLogTemplatesSeederModule,
    NoticeTemplatesSeederModule,
    EmailTemplateUrlCleanupSeederModule,
    AbaGuidesSeederModule,
  ],
  providers: [
    AppService,
    JwtInternalService,
    UserDetailsSubscriber,
    CompanySubscriber,
    ProjectDetailsSubscriber,
    ClientSuppliersSubscriber,
    ContractDetailsSubscriber,
    VariationDetailsSubscriber,
    AdminDetailsSubscriber,
    BankAccountsSubscriber,
    PaymentDetailsSubscriber,
    RetentionDetailsSubscriber,
    SubPaymentsSubscriber,
    ReconciliationReportSubscriber,
    AuditReportSubscriber,
    SubscriptionPlanDetailsSubscriber,
    SubscriptionPricingPlanSubscriber,
    SubscriptionDetailsSubscriber,
    BankStatementsSubscriber,
    IntegrationDetailsSubscriber,
    XeroSyncLogsSubscriber,
    // PaymentClaimsSubscriber,
  ],
})
export class AppModule {
  constructor() {
    console.log(process.cwd());
  }
}
