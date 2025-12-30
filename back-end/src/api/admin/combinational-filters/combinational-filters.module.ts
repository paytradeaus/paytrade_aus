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
} from 'src/entities/compliances.entity';
import { AdminCombinationalFiltersResolver } from './combinational-filters.resolver';
import { AdminCombinationalFiltersService } from './combinational-filters.service';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserDetails,
      CompanyDetails,
      NoticeDetails,
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
    ]),
  ],
  providers: [
    AdminCombinationalFiltersResolver,
    AdminCombinationalFiltersService,
  ],
  exports: [AdminCombinationalFiltersService],
})
export class AdminCombinationalFiltersModule {}
