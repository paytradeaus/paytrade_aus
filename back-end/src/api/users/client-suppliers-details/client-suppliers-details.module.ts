import { Module } from '@nestjs/common';
import { ClientSuppliersDetailsService } from './client-suppliers-details.service';
import { ClientSuppliersDetailsResolver } from './client-suppliers-details.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserDetails } from 'src/entities/user-details.entity';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';
import {
  BankAccounts,
  PaymentClaimInvoices,
  PaymentClaims,
} from 'src/entities/banking.entity';
import { VariationDetails } from 'src/entities/variation-details.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { XeroService } from 'src/api/common/integrations/xero/xero.service';
import { XeroBankAccountDetails } from 'src/entities/xero-bank-account-details.entity';
import { XeroProjectDetails } from 'src/entities/xero-project-details.entity';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';
import { ClientSupplierProjectXeroAccountCodes } from 'src/entities/client-supplier-project-xero-account-codes.entity';
import { XeroContactDetails } from 'src/entities/xero-contact-details.entity';
import { XeroContractDetails } from 'src/entities/xero-contract-details.entity';
import { XeroContactsService } from 'src/api/common/integrations/xero/contacts/xero-contacts.service';
import { IntegrationDetails } from 'src/entities/integration-details.entity';
import { XeroSyncLogs } from 'src/entities/xero-sync-logs.entity';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { BullModule } from '@nestjs/bullmq';
import { XeroRefreshTokenService } from 'src/api/common/integrations/xero/refreshToken/xeroRefreshToken.service';
import { XeroLogTemplates } from 'src/entities/xero-log-templates.entity';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'xero-refresh-token',
    }),
    TypeOrmModule.forFeature([
      UserDetails,
      CompanyDetails,
      CompanyUserRoles,
      AdminDetails,
      ClientSuppliersDetails,
      ActivityLogNew,
      ActivityLogTemplates,
      ContractDetails,
      VariationDetails,
      ProjectDetails,
      BankAccounts,
      PaymentClaims,
      PaymentDetails,
      PaymentClaimInvoices,
      NoticeDetails,
      XeroBankAccountDetails,
      XeroProjectDetails,
      XeroIntegrationDetails,
      ClientSupplierProjectXeroAccountCodes,
      XeroContactDetails,
      XeroContractDetails,
      IntegrationDetails,
      XeroSyncLogs,
      XeroLogTemplates,
    ]),
  ],
  providers: [
    JwtInternalService,
    ClientSuppliersDetailsResolver,
    ClientSuppliersDetailsService,
    ActivityLogService,
    XeroService,
    XeroContactsService,
    XeroRefreshTokenService,
  ],
  exports: [ClientSuppliersDetailsService],
})
export class ClientSuppliersDetailsModule {}
