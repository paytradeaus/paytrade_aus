import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccountTransfers } from 'src/entities/bank-account-transfers.entity';
import { BankAccounts, PaymentClaims } from 'src/entities/banking.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { BankAccountTransfersService } from './bank-account-transfers.service';
import { BankAccountTransfersResolver } from './bank-account-transfers.resolver';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { NoticesModule } from '../../notices/notices.module';

/**
 * Task #244 — Trust Account Transfer wizard module. Stands alongside
 * the existing BankingModule and re-exports its service for use by the
 * Xero webhook side-channel matcher.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      BankAccountTransfers,
      BankAccounts,
      PaymentDetails,
      ContractDetails,
      PaymentClaims,
      UserDetails,
      AdminDetails,
    ]),
    NoticesModule,
  ],
  providers: [
    BankAccountTransfersService,
    BankAccountTransfersResolver,
    JwtInternalService,
  ],
  exports: [BankAccountTransfersService],
})
export class BankAccountTransfersModule {}
