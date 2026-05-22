import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { BankAccountTransfersService } from './bank-account-transfers.service';
import {
  CancelTrustAccountTransferInput,
  ConfirmTrustAccountTransferInput,
  GetBankAccountPreflightInput,
  ListOpenTransfersInput,
  RetryTrustAccountTransferCutoverInput,
  StartTrustAccountTransferInput,
} from './bank-account-transfers.input';
import {
  ConfirmTransferResponse,
  PreflightResponse,
  StartTransferResponse,
  TransferListResponse,
} from './bank-account-transfers.dto';

@Resolver()
export class BankAccountTransfersResolver {
  private logger = new PaytradeLogger('BANK_ACCOUNT_TRANSFERS_RESOLVER');
  constructor(
    private readonly jwt: JwtInternalService,
    private readonly svc: BankAccountTransfersService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => PreflightResponse, { name: 'getBankAccountPreflight' })
  async getBankAccountPreflight(
    @Context() ctx,
    @Args('payload') payload: GetBankAccountPreflightInput,
  ): Promise<PreflightResponse> {
    try {
      const decoded = await this.jwt.decodeJwtToken(ctx);
      const preflight = await this.svc.getBankAccountPreflight(
        decoded,
        payload.bank_account_id,
      );
      return { preflight };
    } catch (e: any) {
      return { warning: true, warningMessage: e?.message ?? String(e) };
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StartTransferResponse, { name: 'startTrustAccountTransfer' })
  async startTrustAccountTransfer(
    @Context() ctx,
    @Args('payload') payload: StartTrustAccountTransferInput,
  ): Promise<StartTransferResponse> {
    try {
      const decoded = await this.jwt.decodeJwtToken(ctx);
      this.logger.log(
        `startTrustAccountTransfer: ${JSON.stringify(payload)} user=${decoded?.userId}`,
      );
      return (await this.svc.startTrustAccountTransfer(decoded, payload)) as any;
    } catch (e: any) {
      this.logger.error(`startTrustAccountTransfer err=${e?.message}`);
      return { warning: true, warningMessage: e?.message ?? String(e) };
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => ConfirmTransferResponse, { name: 'confirmTrustAccountTransfer' })
  async confirmTrustAccountTransfer(
    @Context() ctx,
    @Args('payload') payload: ConfirmTrustAccountTransferInput,
  ): Promise<ConfirmTransferResponse> {
    try {
      const decoded = await this.jwt.decodeJwtToken(ctx);
      this.logger.log(
        `confirmTrustAccountTransfer: transfer_id=${payload.transfer_id} user=${decoded?.userId}`,
      );
      return (await this.svc.confirmTrustAccountTransfer(
        decoded,
        payload.transfer_id,
      )) as any;
    } catch (e: any) {
      this.logger.error(`confirmTrustAccountTransfer err=${e?.message}`);
      return { warning: true, warningMessage: e?.message ?? String(e) };
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => ConfirmTransferResponse, { name: 'cancelTrustAccountTransfer' })
  async cancelTrustAccountTransfer(
    @Context() ctx,
    @Args('payload') payload: CancelTrustAccountTransferInput,
  ): Promise<ConfirmTransferResponse> {
    try {
      const decoded = await this.jwt.decodeJwtToken(ctx);
      return (await this.svc.cancelTrustAccountTransfer(
        decoded,
        payload.transfer_id,
      )) as any;
    } catch (e: any) {
      return { warning: true, warningMessage: e?.message ?? String(e) };
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => ConfirmTransferResponse, {
    name: 'retryTrustAccountTransferCutover',
  })
  async retryTrustAccountTransferCutover(
    @Context() ctx,
    @Args('payload') payload: RetryTrustAccountTransferCutoverInput,
  ): Promise<ConfirmTransferResponse> {
    try {
      const decoded = await this.jwt.decodeJwtToken(ctx);
      return (await this.svc.retryTrustAccountTransferCutover(
        decoded,
        payload.transfer_id,
        payload.dry_run !== false,
      )) as any;
    } catch (e: any) {
      return { warning: true, warningMessage: e?.message ?? String(e) };
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => TransferListResponse, { name: 'listOpenTrustAccountTransfers' })
  async listOpenTrustAccountTransfers(
    @Context() ctx,
    @Args('payload') payload: ListOpenTransfersInput,
  ): Promise<TransferListResponse> {
    try {
      const decoded = await this.jwt.decodeJwtToken(ctx);
      return (await this.svc.listOpenTransfersForAccount(
        decoded,
        payload?.bank_account_id,
      )) as any;
    } catch (e: any) {
      return { transfers: [] };
    }
  }
}
