import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { StringResponse } from 'src/api/users/signup/response/auth.response';

import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { XeroService } from '../xero.service';
import { AutoMapResponse } from '../xero.response';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { Invoice } from 'xero-node';
import { XeroPaymentsService } from './xero-payments.service';
import {
  CreateCreditNotesInput,
  CreateOverPaymentInput,
  CreateOverPaymentRefundInput,
  CreatePaymentInput,
  DeleteCreditNotesInput,
  DeleteOverPaymentInput,
  DeleteOverPaymentRefundInput,
  DeletePaymentInput,
  GetMappedXeroPaymentListsInput,
  GetPaytradePaymentListsInput,
  GetXeroPaymentListsInput,
  YetToMapPaymentsInput,
} from './dto/xero.input';
import {
  GetPaytradePaymentsListResponse,
  GetXeroPaymentsListResponse,
  GetXeroPaymentsResponse,
} from './response/xero.response';
import { XeroResolver } from '../xero.resolver';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Resolver('XeroPayments')
export class XeroPaymentsResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly xeroPaymentsService: XeroPaymentsService,
    private readonly xeroService: XeroService,
    private readonly xeroResolver: XeroResolver,
  ) {
    this.logger = new PaytradeLogger('XERO_PAYMENTS_RESOLVER');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => GetXeroPaymentsResponse, {
    name: 'createPaymentInXero',
    description:
      'Creates a new payment in Xero using the provided payment details.',
  })
  async createPaymentInXero(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing all necessary information to create payments in Xero.',
    })
    payload: CreatePaymentInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for creating payment details with arguments payload: ${JSON.stringify(payload)}`,
      );
      const { headers } = context.req;
      var companyId = headers?.companyid;
      var decoded = await this.jwtInternalService.decodeJwtToken(context);

      const response: any = await this.xeroPaymentsService.createPayment(
        decoded,
        payload,
      );

      if (response) {
        this.logger.log(
          `Xero payment details created successfully with data: ${JSON.stringify(response)}`,
        );
        return framedResponse(
          'SUCCESS',
          `Payment created in Xero successfully`,
          response,
        );
      }
      return framedResponse('ERROR', 'Unable to create payment in xero');
    } catch (error) {
      const isRefreshToken = this.xeroResolver.refreshTokenReAuthenticate({
        error,
      });

      if (isRefreshToken) {
        try {
          const response = await this.xeroService.getAuthUrl(
            companyId,
            decoded?.userId,
            decoded?.isAdmin,
            decoded?.timezone,
          );

          return framedResponse('XERO_REFRESH', response);
        } catch (error) {
          return framedResponse(
            'ERROR',
            error?.message ? error.message : error,
          );
        }
      }

      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'retryFailedExceedsOutstandingPaymentSyncs',
    description:
      'Task #55 — Re-runs the inline "exceeds amount outstanding" recovery against legacy Failed payment sync logs (template 332). Idempotent. Returns a JSON-stringified summary of the scan.',
  })
  async retryFailedExceedsOutstandingPaymentSyncs(
    @Context() context,
    @Args('integration_id', {
      nullable: true,
      description:
        'Optional Xero integration_id to scope the scan to a single integration. When omitted, scans all integrations.',
    })
    integration_id?: number,
    @Args('lookback_days', {
      nullable: true,
      description:
        'How many days of history to scan (default 90, max 365).',
    })
    lookback_days?: number,
    @Args('limit', {
      nullable: true,
      description: 'Maximum failed logs to consider (default 500, max 1000).',
    })
    limit?: number,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for retryFailedExceedsOutstandingPaymentSyncs integration_id=${integration_id} lookback_days=${lookback_days} limit=${limit}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const summary =
        await this.xeroPaymentsService.recoverFailedExceedsOutstandingPaymentSyncs(
          decoded,
          { integration_id, lookback_days, limit },
        );

      return framedResponse(
        'SUCCESS',
        `Retry complete: scanned=${summary.scanned} recovered=${summary.recovered} classified=${summary.classified} skipped=${summary.skipped} failed=${summary.failed}`,
        JSON.stringify(summary),
      );
    } catch (error) {
      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => GetXeroPaymentsResponse, {
    name: 'createOverPaymentInXero',
    description:
      'Creates a new overpayment in Xero using the provided overpayment details.',
  })
  async createOverPaymentInXero(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing all necessary information to create overpayments in Xero.',
    })
    payload: CreateOverPaymentInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for creating overpayment details with arguments payload: ${JSON.stringify(payload)}`,
      );
      const { headers } = context.req;
      var companyId = headers?.companyid;
      var decoded = await this.jwtInternalService.decodeJwtToken(context);

      const response: any = await this.xeroPaymentsService.createOverPayment(
        decoded,
        payload,
      );

      if (response) {
        this.logger.log(
          `Xero overpayment details created successfully with data: ${JSON.stringify(response)}`,
        );
        return framedResponse(
          'SUCCESS',
          `Overpayment created in Xero successfully`,
          response,
        );
      }
      return framedResponse('ERROR', 'Unable to create overpayment in xero');
    } catch (error) {
      const isRefreshToken = this.xeroResolver.refreshTokenReAuthenticate({
        error,
      });

      if (isRefreshToken) {
        try {
          const response = await this.xeroService.getAuthUrl(
            companyId,
            decoded?.userId,
            decoded?.isAdmin,
            decoded?.timezone,
          );

          return framedResponse('XERO_REFRESH', response);
        } catch (error) {
          return framedResponse(
            'ERROR',
            error?.message ? error.message : error,
          );
        }
      }

      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => GetXeroPaymentsResponse, {
    name: 'createOverPaymentRefundInXero',
    description: 'Creates a refund for an overpayment in Xero.',
  })
  async createOverPaymentRefundInXero(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing all necessary information to create overpayment refunds in Xero.',
    })
    payload: CreateOverPaymentRefundInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for creating overpayment refund details with arguments payload: ${JSON.stringify(payload)}`,
      );
      const { headers } = context.req;
      var companyId = headers?.companyid;
      var decoded = await this.jwtInternalService.decodeJwtToken(context);

      const response: any =
        await this.xeroPaymentsService.createOverPaymentRefund(
          decoded,
          payload,
        );

      if (response) {
        this.logger.log(
          `Xero overpayment refund details created successfully with data: ${JSON.stringify(response)}`,
        );
        return framedResponse(
          'SUCCESS',
          `Overpayment refund created in Xero successfully`,
          response,
        );
      }
      return framedResponse(
        'ERROR',
        'Unable to create overpayment refund in xero',
      );
    } catch (error) {
      const isRefreshToken = this.xeroResolver.refreshTokenReAuthenticate({
        error,
      });

      if (isRefreshToken) {
        try {
          const response = await this.xeroService.getAuthUrl(
            companyId,
            decoded?.userId,
            decoded?.isAdmin,
            decoded?.timezone,
          );

          return framedResponse('XERO_REFRESH', response);
        } catch (error) {
          return framedResponse(
            'ERROR',
            error?.message ? error.message : error,
          );
        }
      }

      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => GetXeroPaymentsResponse, {
    name: 'deletePaymentInXero',
    description:
      'Deletes a payment in Xero based on the provided payment details.',
  })
  async deletePaymentInXero(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing all necessary information to delete payments in Xero.',
    })
    payload: DeletePaymentInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for deleting payment details with arguments payload: ${JSON.stringify(payload)}`,
      );
      const { headers } = context.req;
      var companyId = headers?.companyid;
      var decoded = await this.jwtInternalService.decodeJwtToken(context);

      const response: any = await this.xeroPaymentsService.deletePayment(
        decoded,
        payload,
      );

      if (response) {
        this.logger.log(
          `Xero payment details deleted successfully with data: ${JSON.stringify(response)}`,
        );
        return framedResponse(
          'SUCCESS',
          `Payment deleted in Xero successfully`,
          response,
        );
      }
      return framedResponse('ERROR', 'Unable to delete payment in xero');
    } catch (error) {
      const isRefreshToken = this.xeroResolver.refreshTokenReAuthenticate({
        error,
      });

      if (isRefreshToken) {
        try {
          const response = await this.xeroService.getAuthUrl(
            companyId,
            decoded?.userId,
            decoded?.isAdmin,
            decoded?.timezone,
          );

          return framedResponse('XERO_REFRESH', response);
        } catch (error) {
          return framedResponse(
            'ERROR',
            error?.message ? error.message : error,
          );
        }
      }

      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => GetXeroPaymentsResponse, {
    name: 'deleteOverPaymentInXero',
    description:
      'Deletes an overpayment in Xero based on the provided overpayment details.',
  })
  async deleteOverPaymentInXero(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing all necessary information to delete overpayments in Xero.',
    })
    payload: DeleteOverPaymentInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for deleting overpayment details with arguments payload: ${JSON.stringify(payload)}`,
      );
      const { headers } = context.req;
      var companyId = headers?.companyid;
      var decoded = await this.jwtInternalService.decodeJwtToken(context);

      const response: any = await this.xeroPaymentsService.deleteOverPayment(
        decoded,
        payload,
      );

      if (response) {
        this.logger.log(
          `Xero overpayment details deleted successfully with data: ${JSON.stringify(response)}`,
        );
        return framedResponse(
          'SUCCESS',
          `Overpayment deleted in Xero successfully`,
          response,
        );
      }
      return framedResponse('ERROR', 'Unable to delete overpayment in xero');
    } catch (error) {
      const isRefreshToken = this.xeroResolver.refreshTokenReAuthenticate({
        error,
      });

      if (isRefreshToken) {
        try {
          const response = await this.xeroService.getAuthUrl(
            companyId,
            decoded?.userId,
            decoded?.isAdmin,
            decoded?.timezone,
          );

          return framedResponse('XERO_REFRESH', response);
        } catch (error) {
          return framedResponse(
            'ERROR',
            error?.message ? error.message : error,
          );
        }
      }

      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => GetXeroPaymentsResponse, {
    name: 'deleteOverPaymentRefundInXero',
    description:
      'Deletes an overpayment refund in Xero based on the provided refund details.',
  })
  async deleteOverPaymentRefundInXero(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing all necessary information to delete overpayment refunds in Xero.',
    })
    payload: DeleteOverPaymentRefundInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for deleting overpayment refund details with arguments payload: ${JSON.stringify(payload)}`,
      );
      const { headers } = context.req;
      var companyId = headers?.companyid;
      var decoded = await this.jwtInternalService.decodeJwtToken(context);

      const response: any =
        await this.xeroPaymentsService.deleteOverPaymentRefund(
          decoded,
          payload,
        );

      if (response) {
        this.logger.log(
          `Xero overpayment refund details deleted successfully with data: ${JSON.stringify(response)}`,
        );
        return framedResponse(
          'SUCCESS',
          `Overpayment refund deleted in Xero successfully`,
          response,
        );
      }
      return framedResponse(
        'ERROR',
        'Unable to delete overpayment refund in xero',
      );
    } catch (error) {
      const isRefreshToken = this.xeroResolver.refreshTokenReAuthenticate({
        error,
      });

      if (isRefreshToken) {
        try {
          const response = await this.xeroService.getAuthUrl(
            companyId,
            decoded?.userId,
            decoded?.isAdmin,
            decoded?.timezone,
          );

          return framedResponse('XERO_REFRESH', response);
        } catch (error) {
          return framedResponse(
            'ERROR',
            error?.message ? error.message : error,
          );
        }
      }

      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => GetXeroPaymentsResponse, {
    name: 'createCreditNotesInXero',
    description:
      'Creates credit notes in Xero using the provided credit note details.',
  })
  async createCreditNotesInXero(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing all necessary information to create credit notes in Xero.',
    })
    payload: CreateCreditNotesInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for creating credit note details with arguments payload: ${JSON.stringify(payload)}`,
      );
      const { headers } = context.req;
      var companyId = headers?.companyid;
      var decoded = await this.jwtInternalService.decodeJwtToken(context);

      const response: any = await this.xeroPaymentsService.createCreditNotes(
        decoded,
        payload,
      );

      if (response) {
        this.logger.log(
          `Xero credit note details created successfully with data: ${JSON.stringify(response)}`,
        );
        return framedResponse(
          'SUCCESS',
          `Credit note created in Xero successfully`,
          response,
        );
      }
      return framedResponse('ERROR', 'Unable to create credit note in xero');
    } catch (error) {
      const isRefreshToken = this.xeroResolver.refreshTokenReAuthenticate({
        error,
      });

      if (isRefreshToken) {
        try {
          const response = await this.xeroService.getAuthUrl(
            companyId,
            decoded?.userId,
            decoded?.isAdmin,
            decoded?.timezone,
          );

          return framedResponse('XERO_REFRESH', response);
        } catch (error) {
          return framedResponse(
            'ERROR',
            error?.message ? error.message : error,
          );
        }
      }

      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => GetXeroPaymentsResponse, {
    name: 'deleteCreditNotesInXero',
    description:
      'Deletes credit notes in Xero based on the provided credit note details.',
  })
  async deleteCreditNotesInXero(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing all necessary information to delete credit notes in Xero.',
    })
    payload: DeleteCreditNotesInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for deleting credit note details with arguments payload: ${JSON.stringify(payload)}`,
      );
      const { headers } = context.req;
      var companyId = headers?.companyid;
      var decoded = await this.jwtInternalService.decodeJwtToken(context);

      const response: any = await this.xeroPaymentsService.deleteCreditNotes(
        decoded,
        payload,
      );

      if (response) {
        this.logger.log(
          `Xero credit note details deleted successfully with data: ${JSON.stringify(response)}`,
        );
        return framedResponse(
          'SUCCESS',
          `Credit note deleted in Xero successfully`,
          response,
        );
      }
      return framedResponse('ERROR', 'Unable to delete credit note in xero');
    } catch (error) {
      const isRefreshToken = this.xeroResolver.refreshTokenReAuthenticate({
        error,
      });

      if (isRefreshToken) {
        try {
          const response = await this.xeroService.getAuthUrl(
            companyId,
            decoded?.userId,
            decoded?.isAdmin,
            decoded?.timezone,
          );

          return framedResponse('XERO_REFRESH', response);
        } catch (error) {
          return framedResponse(
            'ERROR',
            error?.message ? error.message : error,
          );
        }
      }

      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => StringResponse, {
    name: 'getPaymentByPaymentId',
    description: 'Fetches a payment from Xero by payment ID and company ID.',
  })
  async getPaymentByPaymentId(
    @Context() context,
    @Args('payment_id', {
      description: 'ID of the payment to fetch from Xero.',
    })
    payment_id: string,
    @Args('company_id', {
      description: 'ID of the company associated with the payment.',
    })
    company_id: number,
  ): Promise<any> {
    try {
      var decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response = await this.xeroPaymentsService.getPaymentByPaymentId(
        payment_id,
        company_id,
      );
      return framedResponse('SUCCESS', JSON.stringify(response));
    } catch (error) {
      const isRefreshToken = this.xeroResolver.refreshTokenReAuthenticate({
        error,
      });

      if (isRefreshToken) {
        try {
          const response = await this.xeroService.getAuthUrl(
            company_id,
            decoded?.userId,
            decoded?.isAdmin,
            decoded?.timezone,
          );

          return framedResponse('XERO_REFRESH', response);
        } catch (error) {
          return framedResponse(
            'ERROR',
            error?.message ? error.message : error,
          );
        }
      }

      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'syncAllPaymentsByCompanyId',
    description:
      'Synchronizes all payments from Xero for the specified company.',
  })
  async syncAllPaymentsByCompanyId(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company whose payments will be synchronized.',
    })
    company_id: number,
    @Args('sync_id', {
      nullable: true,
      description: 'Optional synchronization ID for Xero.',
    })
    sync_id: string,
  ): Promise<any> {
    try {
      var decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response =
        await this.xeroPaymentsService.syncAllPaymentsByCompanyId(
          decoded,
          company_id,
          sync_id,
        );
      return framedResponse('SUCCESS', response);
    } catch (error) {
      const isRefreshToken = this.xeroResolver.refreshTokenReAuthenticate({
        error,
      });

      if (isRefreshToken) {
        try {
          const response = await this.xeroService.getAuthUrl(
            company_id,
            decoded?.userId,
            decoded?.isAdmin,
            decoded?.timezone,
          );

          return framedResponse('XERO_REFRESH', response);
        } catch (error) {
          return framedResponse(
            'ERROR',
            error?.message ? error.message : error,
          );
        }
      }

      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => GetXeroPaymentsListResponse, {
    name: 'getXeroPaymentListsForCompany',
    description:
      'Retrieves a list of payments from Xero for a specific company.',
  })
  async getXeroPaymentListsForCompany(
    @Args('payload', {
      description:
        'Input payload containing filters, pagination, and type (mapped or unmapped) for fetching payment lists.',
    })
    payload: GetXeroPaymentListsInput,
  ) {
    try {
      this.logger.log(
        `Request received for getting payment lists: ${JSON.stringify(payload)}`,
      );
      const paymentLists =
        await this.xeroPaymentsService.getXeroPaymentListsForCompany(payload);
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(paymentLists)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Fetched payments successfully`,
        paymentLists,
      );
    } catch (error) {
      const errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Errored inside the client with message: ${errorMessage}`,
      );
      return framedResponse('ERROR', errorMessage);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => GetPaytradePaymentsListResponse, {
    name: 'getPaytradePaymentListsForCompany',
    description:
      'Retrieves a list of payments from Paytrade for a specific company.',
  })
  async getPaytradePaymentListsForCompany(
    @Args('payload', {
      description:
        'Input payload containing filters, pagination, and type (mapped or unmapped) for fetching payment lists.',
    })
    payload: GetPaytradePaymentListsInput,
  ) {
    try {
      this.logger.log(
        `Request received for getting payment lists: ${JSON.stringify(payload)}`,
      );
      const paymentLists =
        await this.xeroPaymentsService.getPaytradePaymentListsForCompany(
          payload,
        );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(paymentLists)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Fectched payments successfully`,
        paymentLists,
      );
    } catch (error) {
      const errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Errored inside the client with message: ${errorMessage}`,
      );
      return framedResponse('ERROR', errorMessage);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => GetXeroPaymentsListResponse, {
    name: 'getMappedPaymentLists',
    description: 'Fetches a list of mapped payments for the specified company.',
  })
  async getMappedPaymentLists(
    @Args('payload', {
      description:
        'Input payload containing filters, pagination, and type (mapped or unmapped) for fetching payment lists.',
    })
    payload: GetMappedXeroPaymentListsInput,
  ) {
    try {
      this.logger.log(
        `Request received for getting payment lists: ${JSON.stringify(payload)}`,
      );
      const paymentLists =
        await this.xeroPaymentsService.getMappedPaymentLists(payload);
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(paymentLists)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Fetched mapped payments successfully`,
        paymentLists,
      );
    } catch (error) {
      const errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Errored inside the client with message: ${errorMessage}`,
      );
      return framedResponse('ERROR', errorMessage);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'manualMappingPayment',
    description: 'Manually maps unmapped payments for the specified company.',
  })
  async manualMappingPayment(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing payments and mapping details for manual mapping.',
    })
    payload: YetToMapPaymentsInput,
  ) {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const { headers } = context.req;
      const companyId = headers?.companyid;
      const response = await this.xeroPaymentsService.manualMappingPayment(
        payload,
        companyId,
        decoded,
      );
      return framedResponse('SUCCESS', response);
    } catch (error) {
      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => GetXeroPaymentsResponse, {
    name: 'retryRetentionTransferFromSyncLog',
    description:
      'Task #61 — Re-fires the BankTransfer leg of a payment from a Failed retention-transfer sync log (templates 496/497/498).',
  })
  async retryRetentionTransferFromSyncLog(
    @Context() context,
    @Args('sync_log_id', {
      description:
        'The id of the Failed retention-transfer sync log to retry.',
    })
    sync_log_id: string,
  ): Promise<any> {
    var companyId: any;
    var decoded: any;
    try {
      const { headers } = context.req;
      companyId = headers?.companyid;
      decoded = await this.jwtInternalService.decodeJwtToken(context);

      const response: any =
        await this.xeroPaymentsService.retryRetentionTransferFromSyncLog(
          decoded,
          sync_log_id,
          Number(companyId),
        );

      if (response) {
        return framedResponse(
          'SUCCESS',
          `Retention transfer retry triggered — see new sync log entry for the outcome`,
          response,
        );
      }
      return framedResponse(
        'ERROR',
        'Retention transfer retry failed — see the new sync log entry for details',
      );
    } catch (error) {
      const isRefreshToken = this.xeroResolver.refreshTokenReAuthenticate({
        error,
      });

      if (isRefreshToken) {
        try {
          const response = await this.xeroService.getAuthUrl(
            companyId,
            decoded?.userId,
            decoded?.isAdmin,
            decoded?.timezone,
          );

          return framedResponse('XERO_REFRESH', response);
        } catch (error) {
          return framedResponse(
            'ERROR',
            error?.message ? error.message : error,
          );
        }
      }

      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'unMappingPayment',
    description: 'Removes mapping for a specific payment.',
  })
  async unMappingPayment(
    @Context() context,
    @Args('payment_id', { description: 'ID of the payment to unmap.' })
    payment_id: string,
  ) {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const { headers } = context.req;
      const companyId = headers?.companyid;
      const response = await this.xeroPaymentsService.unMappingPayment(
        payment_id,
        companyId,
        decoded,
      );
      return framedResponse('SUCCESS', response);
    } catch (error) {
      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }
}
