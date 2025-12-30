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
import { UserCombinationalFiltersResolver } from './combinational-filters.resolver';
import { UserCombinationalFiltersService } from './combinational-filters.service';
import { RetentionDetails } from 'src/entities/retention-details.entity';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';

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
      RetentionDetails,
    ]),
  ],
  providers: [
    UserCombinationalFiltersResolver,
    UserCombinationalFiltersService,
  ],
  exports: [UserCombinationalFiltersService],
})
export class UserCombinationalFiltersModule {}
