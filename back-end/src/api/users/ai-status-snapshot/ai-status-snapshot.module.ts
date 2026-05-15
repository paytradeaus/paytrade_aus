import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ComplianceOfProjects,
} from 'src/entities/compliances.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { ReconciliationReport } from 'src/entities/reconciliation-report.entity';
import { SubPayments } from 'src/entities/sub-payments.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { PaymentClaims } from 'src/entities/banking.entity';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { XeroSyncLogs } from 'src/entities/xero-sync-logs.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from 'src/api/auth/constants';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { AiStatusSnapshotService } from './ai-status-snapshot.service';
import { AiStatusSnapshotResolver } from './ai-status-snapshot.resolver';
import { AiStatusSnapshotController } from './ai-status-snapshot.controller';
import { ComplianceChecker } from './checkers/compliance.checker';
import { NoticesChecker } from './checkers/notices.checker';
import { ReconciliationChecker } from './checkers/reconciliation.checker';
import { PaymentsChecker } from './checkers/payments.checker';
import { ContractsChecker } from './checkers/contracts.checker';
import { ClaimsChecker } from './checkers/claims.checker';
import { ContactsChecker } from './checkers/contacts.checker';
import { SyncChecker } from './checkers/sync.checker';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ComplianceOfProjects,
      ProjectDetails,
      NoticeDetails,
      ReconciliationReport,
      SubPayments,
      PaymentDetails,
      ContractDetails,
      PaymentClaims,
      ClientSuppliersDetails,
      XeroSyncLogs,
      UserDetails,
      AdminDetails,
    ]),
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AiStatusSnapshotController],
  providers: [
    JwtInternalService,
    AiStatusSnapshotService,
    AiStatusSnapshotResolver,
    ComplianceChecker,
    NoticesChecker,
    ReconciliationChecker,
    PaymentsChecker,
    ContractsChecker,
    ClaimsChecker,
    ContactsChecker,
    SyncChecker,
  ],
  exports: [AiStatusSnapshotService],
})
export class AiStatusSnapshotModule {}
