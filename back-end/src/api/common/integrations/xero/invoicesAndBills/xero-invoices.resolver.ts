import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { XeroInvoicesService } from './xero-invoices.service';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { StringResponse } from 'src/api/users/signup/response/auth.response';
import {
  CreateClaimInput,
  CreateOverpaymentInput,
  GetMappedXeroInvoicesListsInput,
  GetPaytradeInvoicesListsInput,
  GetXeroInvoicesListsInput,
  YetToMapInvoicesInput,
} from './dto/xero.input';
import {
  GetPaytradeInvoicesListResponse,
  GetPaytradeInvoicesResponse,
  GetXeroInvoiceForClaimResponse,
  GetXeroInvoicesListResponse,
  GetXeroInvoicesResponse,
} from './response/xero.response';
import {
  GetRetentionJournalsResponse,
  GetClaimSyncLogsResponse,
} from '../xero.response';
import { XeroManualJournalService } from '../manualJournals/xero-manual-journal.service';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { XeroService } from '../xero.service';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { XeroWebhookService } from 'src/api/common/xero-webhooks/webhook.service';
import { ClaimReasonInput } from 'src/api/users/banking/payment-claims/payment-claims.input';
import { XeroResolver } from '../xero.resolver';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Resolver('XeroInvoicesBills')
export class XeroInvoicesResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly xeroInvoicesService: XeroInvoicesService,
    private readonly xeroManualJournalService: XeroManualJournalService,
    private readonly xeroWebhookService: XeroWebhookService,
    private readonly xeroService: XeroService,
    private readonly xeroResolver: XeroResolver,
  ) {
    this.logger = new PaytradeLogger('XERO_INVOICES_BILLS_RESOLVER');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => GetXeroInvoicesResponse, {
    name: 'createInvoiceOrBillInXero',
    description:
      'Creates a new invoice or bill in Xero for the specified payment claim.',
  })
  async createInvoiceOrBillInXero(
    @Context() context,
    @Args('payment_claim_id', {
      description:
        'ID of the payment claim for which the invoice or bill is created.',
    })
    payment_claim_id: number,
    @Args('sync_id', {
      nullable: true,
      description: 'Optional synchronization ID for Xero.',
    })
    sync_id?: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for creating invoice details with arguments payment_claim_id: ${payment_claim_id}`,
      );
      const { headers } = context.req;
      var companyId = headers?.companyid;
      var decoded = await this.jwtInternalService.decodeJwtToken(context);

      const xeroPayload = {
        payment_claim_id,
        mapped_status: 'System',
        sync_id,
      };

      const response: any =
        await this.xeroInvoicesService.createInvoiceOrBillInXero(
          decoded,
          xeroPayload,
        );

      if (response) {
        this.logger.log(
          `Xero ${response.claim_type === 'Billable' ? 'Bills' : 'Invoices'} details created successfully with data: ${JSON.stringify(response)}`,
        );
        return framedResponse(
          'SUCCESS',
          `${response.claim_type === 'Billable' ? 'Bills' : 'Invoices'} created in Xero successfully`,
          response,
        );
      }
      return framedResponse('ERROR', 'Unable to create claim in xero');
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
  @Mutation(() => GetXeroInvoicesResponse, {
    name: 'editInvoiceOrBillInXero',
    description:
      'Edits an existing invoice or bill in Xero using the payment claim ID.',
  })
  async editInvoiceOrBillInXero(
    @Context() context,
    @Args('payment_claim_id', {
      description: 'ID of the payment claim to edit in Xero.',
    })
    payment_claim_id: number,
    @Args('sync_id', {
      nullable: true,
      description: 'Optional synchronization ID for Xero.',
    })
    sync_id?: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for editing invoice details with arguments payment_claim_id: ${payment_claim_id}`,
      );
      const { headers } = context.req;
      var companyId = headers?.companyid;
      var decoded = await this.jwtInternalService.decodeJwtToken(context);

      const xeroPayload = {
        payment_claim_id,
        sync_id,
      };

      const response: any = await this.xeroInvoicesService.editInvoicesOrBills(
        decoded,
        xeroPayload,
      );

      if (response) {
        this.logger.log(
          `Xero ${response.claim_type === 'Billable' ? 'Bills' : 'Invoices'} details edited successfully with data: ${JSON.stringify(response)}`,
        );
        return framedResponse(
          'SUCCESS',
          `${response.claim_type === 'Billable' ? 'Bills' : 'Invoices'} edited in Xero successfully`,
          response,
        );
      }
      return framedResponse('ERROR', 'Unable to edit claim in xero');
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
  @Mutation(() => GetXeroInvoicesResponse, {
    name: 'deleteInvoiceOrBillInXero',
    description:
      'Deletes an invoice or bill in Xero using the payment claim ID.',
  })
  async deleteInvoiceOrBillInXero(
    @Context() context,
    @Args('payment_claim_id', {
      description: 'ID of the payment claim to delete from Xero.',
    })
    payment_claim_id: number,
    @Args('sync_id', {
      nullable: true,
      description: 'Optional synchronization ID for Xero.',
    })
    sync_id?: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for deleting invoice details with arguments payment_claim_id: ${payment_claim_id}`,
      );
      const { headers } = context.req;
      var companyId = headers?.companyid;
      var decoded = await this.jwtInternalService.decodeJwtToken(context);

      const xeroPayload = {
        payment_claim_id,
        sync_id,
      };

      const response: any =
        await this.xeroInvoicesService.deleteInvoicesOrBills(
          decoded,
          xeroPayload,
        );

      if (response) {
        this.logger.log(
          `Xero ${response.claim_type === 'Billable' ? 'Bill' : 'Invoice'} details deleted successfully with data: ${JSON.stringify(response)}`,
        );
        return framedResponse(
          'SUCCESS',
          `${response.claim_type === 'Billable' ? 'Bill' : 'Invoice'} deleted in Xero successfully`,
          response,
        );
      }
      return framedResponse('ERROR', 'Unable to delete claim in xero');
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
  @Mutation(() => GetPaytradeInvoicesResponse, {
    name: 'createInvoiceOrBillInPaytrade',
    description:
      'Creates an invoice or bill in Paytrade for the specified company.',
  })
  async createInvoiceOrBillInPaytrade(
    @Context() context,
    @Args('invoice_id', {
      description: 'Unique identifier of the invoice to create in Paytrade.',
    })
    invoice_id: string,
    @Args('company_id', {
      description: 'ID of the company for which the invoice will be created.',
    })
    company_id: number,
    @Args('sync_id', {
      nullable: true,
      description: 'Optional synchronization ID for Paytrade.',
    })
    sync_id?: string,
    @Args('retention_id', {
      nullable: true,
      description: 'Optional retention ID for the invoice.',
    })
    retention_id?: number,
    @Args('associated_retention_sub_payment_id', {
      nullable: true,
      description: 'Optional associated retention sub-payment ID.',
    })
    associated_retention_sub_payment_id?: number,
    @Args('claims_with_reason', {
      type: () => [ClaimReasonInput],
      nullable: true,
      description: 'List of claims along with their reasons.',
    })
    claims_with_reason?: ClaimReasonInput[],
    @Args('compulsory_attachment_ids', {
      type: () => [String],
      nullable: true,
      description:
        'List of compulsory attachment IDs required for the invoice.',
    })
    compulsory_attachment_ids?: string[],
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for creating invoice details with arguments invoice_id: ${invoice_id}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const xeroPayload = {
        company_id,
        invoice_id,
        sync_id,
        retention_id,
        associated_retention_sub_payment_id,
        claims_with_reason,
        compulsory_attachment_ids,
      };

      const response: any =
        await this.xeroInvoicesService.insertClaimDetailsInPaytrade(
          decoded,
          xeroPayload,
        );
      this.logger.log(
        `Paytrade Invoices details created successfully with data: ${JSON.stringify(response)}`,
      );
      if (response) {
        return framedResponse(
          'SUCCESS',
          'Claim created in paytrade successfully',
          response,
        );
      }
      return framedResponse('ERROR', 'Unable to create claim in paytrade');
    } catch (error) {
      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => GetXeroInvoiceForClaimResponse, {
    name: 'getXeroInvoiceForClaim',
    description:
      'Returns cached Xero invoice/bill metadata (invoice number, status, deep link, cached PDF availability) for a Paytrade payment claim.',
  })
  async getXeroInvoiceForClaim(
    @Args('payment_claim_id', {
      description: 'Paytrade payment_claim_id to look up cached Xero metadata for.',
    })
    payment_claim_id: number,
    @Context() context,
  ): Promise<any> {
    try {
      const { headers } = context.req;
      const companyId = Number(headers?.companyid);
      const data =
        await this.xeroInvoicesService.getXeroInvoiceForClaim(
          payment_claim_id,
          companyId,
        );
      if (!data) {
        return framedResponse('SUCCESS', 'No Xero invoice mapped for this claim', null);
      }
      return framedResponse('SUCCESS', 'Xero invoice metadata fetched', data);
    } catch (error) {
      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => GetRetentionJournalsResponse, {
    name: 'getXeroRetentionJournalsForClaim',
    description:
      'Phase 3 — returns the retention gross-up Manual Journals PayTrade has posted to Xero for a given claim (newest first).',
  })
  async getXeroRetentionJournalsForClaim(
    @Args('payment_claim_id', {
      description: 'Paytrade payment_claim_id to look up retention journals for.',
    })
    payment_claim_id: number,
    @Context() context,
  ): Promise<any> {
    try {
      const { headers } = context.req;
      const companyId = Number(headers?.companyid);
      const data =
        await this.xeroManualJournalService.listJournalsForClaim(
          payment_claim_id,
          companyId,
        );
      return framedResponse(
        'SUCCESS',
        'Retention journals fetched',
        data || [],
      );
    } catch (error) {
      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => GetClaimSyncLogsResponse, {
    name: 'getXeroSyncLogsForClaim',
    description:
      'Task #82 — returns Xero sync log entries (Invoices/Bills/Payments) scoped to a single claim and its payments. Newest first, capped at 50 rows.',
  })
  async getXeroSyncLogsForClaim(
    @Args('payment_claim_id', {
      description: 'Paytrade payment_claim_id to scope sync logs to.',
    })
    payment_claim_id: number,
    @Context() context,
  ): Promise<any> {
    try {
      const { headers } = context.req;
      const companyId = Number(headers?.companyid);
      const data = await this.xeroInvoicesService.getXeroSyncLogsForClaim(
        payment_claim_id,
        companyId,
      );
      return framedResponse('SUCCESS', 'Claim sync logs fetched', data || []);
    } catch (error) {
      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'retryRetentionGrossUpJournal',
    description:
      'Phase 3 — re-attempt posting a previously-failed retention gross-up Manual Journal for a claim.',
  })
  async retryRetentionGrossUpJournal(
    @Context() context,
    @Args('payment_claim_id', {
      description: 'Paytrade payment_claim_id to retry the gross-up MJ for.',
    })
    payment_claim_id: number,
  ): Promise<any> {
    try {
      const { headers } = context.req;
      const companyId = Number(headers?.companyid);
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const result =
        await this.xeroInvoicesService.retryRetentionGrossUpJournalForClaim(
          decoded,
          companyId,
          payment_claim_id,
        );
      return framedResponse(
        result.status as any,
        result.message,
      );
    } catch (error) {
      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => StringResponse, {
    name: 'getXeroInvoicePdfDownloadToken',
    description:
      'Returns a short-lived JWT-signed download token for the cached Xero PDF of a payment claim. Use as `Bearer` against GET /files/xeroPdf.',
  })
  async getXeroInvoicePdfDownloadToken(
    @Context() context,
    @Args('payment_claim_id', {
      description: 'Paytrade payment_claim_id whose Xero PDF should be downloaded.',
    })
    payment_claim_id: number,
  ): Promise<any> {
    try {
      const { headers } = context.req;
      const companyId = Number(headers?.companyid);
      if (!companyId) {
        return framedResponse('ERROR', 'Missing company context');
      }
      const meta =
        await this.xeroInvoicesService.getXeroInvoiceForClaim(
          payment_claim_id,
          companyId,
        );
      if (!meta) {
        return framedResponse('ERROR', 'No Xero invoice mapped for this claim');
      }
      const jwtMod: any = require('jsonwebtoken');
      const { jwtConstants } = require('../../../../auth/constants');
      const token = jwtMod.sign(
        {
          payment_claim_id,
          company_id: companyId,
          fileName: `Xero-${(meta as any).invoice_number || meta.invoice_id}.pdf`,
        },
        jwtConstants.secret,
        { expiresIn: '5m' },
      );
      return framedResponse('SUCCESS', token);
    } catch (error) {
      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => StringResponse, {
    name: 'getInvoiceByInvoiceId',
    description:
      'Fetches invoice or bill details from Xero using the invoice ID and company ID.',
  })
  async getInvoiceByInvoiceId(
    @Context() context,
    @Args('invoice_id', {
      description: 'Unique identifier of the invoice to fetch.',
    })
    invoice_id: string,
    @Args('company_id', {
      description: 'ID of the company associated with the invoice.',
    })
    company_id: number,
  ): Promise<any> {
    try {
      const { headers } = context.req;
      var companyId = headers?.companyid;
      var decoded = await this.jwtInternalService.decodeJwtToken(context);

      const response = await this.xeroInvoicesService.getInvoiceByInvoiceId(
        invoice_id,
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
    name: 'syncAllInvoicesOrBillsByCompanyId',
    description: `Synchronizes all invoices or bills from Xero for the specified company. Type must be 'bill' or 'invoice'.`,
  })
  async syncAllInvoicesOrBillsByCompanyId(
    @Context() context,
    @Args('company_id', {
      description:
        'ID of the company whose invoices or bills are being synchronized.',
    })
    company_id: number,
    @Args('type', {
      description: "Specify 'bill' or 'invoice' to sync the respective type.",
    })
    type: 'bill' | 'invoice',
    @Args('sync_id', {
      nullable: true,
      description: 'Optional synchronization ID for Xero.',
    })
    sync_id?: string,
  ): Promise<any> {
    try {
      var decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response =
        await this.xeroInvoicesService.syncAllInvoicesOrBillsByCompanyId(
          decoded,
          company_id,
          type,
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
  @Query(() => GetXeroInvoicesListResponse, {
    name: 'getXeroInvoiceBillListsForCompany',
    description:
      'Retrieves a list of invoices or bills from Xero for a specific company.',
  })
  async getXeroInvoiceBillListsForCompany(
    @Args('payload', {
      description:
        'Input payload containing filters, pagination, and type (bill or invoice) for fetching invoice/bill lists.',
    })
    payload: GetXeroInvoicesListsInput,
  ) {
    try {
      this.logger.log(
        `Request received for getting invoice lists: ${JSON.stringify(payload)}`,
      );
      const invoiceLists =
        await this.xeroInvoicesService.getXeroInvoiceBillListsForCompany(
          payload,
        );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(invoiceLists)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Fetched ${payload.type === 'bill' ? 'bills' : 'invoices'} successfully`,
        invoiceLists,
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
  @Query(() => GetPaytradeInvoicesListResponse, {
    name: 'getPaytradeInvoiceListsForCompany',
    description:
      'Retrieves a list of invoices or bills from Paytrade for a specific company.',
  })
  async getPaytradeInvoiceListsForCompany(
    @Args('payload', {
      description:
        'Input payload containing filters, pagination, and type (bill or invoice) for fetching invoice/bill lists.',
    })
    payload: GetPaytradeInvoicesListsInput,
  ) {
    try {
      this.logger.log(
        `Request received for getting invoice lists: ${JSON.stringify(payload)}`,
      );
      const invoiceLists =
        await this.xeroInvoicesService.getPaytradeInvoiceListsForCompany(
          payload,
        );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(invoiceLists)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Fectched ${payload.type === 'bill' ? 'bills' : 'invoices'} successfully`,
        invoiceLists,
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
  @Query(() => GetXeroInvoicesListResponse, {
    name: 'getMappedInvoiceBillLists',
    description:
      'Fetches a list of invoices or bills that have been mapped for the specified company.',
  })
  async getMappedInvoiceBillLists(
    @Args('payload', {
      description:
        'Input payload containing filters, pagination, and type (bill or invoice) for fetching invoice/bill lists.',
    })
    payload: GetMappedXeroInvoicesListsInput,
  ) {
    try {
      this.logger.log(
        `Request received for getting invoice lists: ${JSON.stringify(payload)}`,
      );
      const invoiceLists =
        await this.xeroInvoicesService.getMappedInvoiceBillLists(payload);
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(invoiceLists)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Fetched mapped ${payload.type === 'bill' ? 'bills' : 'invoices'} successfully`,
        invoiceLists,
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
    name: 'manualMappingInvoiceBill',
    description:
      'Manually maps unmapped invoices or bills for the specified company.',
  })
  async manualMappingInvoiceBill(
    @Context() context,
    @Args('payload', {
      description:
        'Input payload containing the invoices/bills and mapping details to manually map.',
    })
    payload: YetToMapInvoicesInput,
  ) {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const { headers } = context.req;
      const companyId = headers?.companyid;
      const response = await this.xeroInvoicesService.manualMappingInvoiceBill(
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
  @Mutation(() => StringResponse, {
    name: 'unMappingInvoiceBill',
    description: 'Removes mapping for a specific invoice or bill.',
  })
  async unMappingInvoiceBill(
    @Context() context,
    @Args('invoice_id', {
      description: 'Unique identifier of the invoice or bill to unmap.',
    })
    invoice_id: string,
  ) {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const { headers } = context.req;
      const companyId = headers?.companyid;
      const response = await this.xeroInvoicesService.unMappingInvoiceBill(
        invoice_id,
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
  @Mutation(() => GetPaytradeInvoicesResponse, {
    name: 'createClaimInPaytrade',
    description: 'Creates a claim in Paytrade using the provided payload.',
  })
  async createClaimInPaytrade(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing all necessary information to create a claim in Paytrade.',
    })
    payload: CreateClaimInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for creating invoice details with arguments payload: ${JSON.stringify(payload)}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const response: any = await this.xeroWebhookService.createClaimInPaytrade(
        payload,
        decoded,
      );
      this.logger.log(
        `Paytrade claim details created successfully with data: ${JSON.stringify(response)}`,
      );
      if (response) {
        return framedResponse(
          'SUCCESS',
          'Claim created in paytrade successfully',
          response,
        );
      }
      return framedResponse('ERROR', 'Unable to create claim in paytrade');
    } catch (error) {
      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'checkAndCreateOverPaymentAndRefunds',
    description:
      'Checks for overpayments and creates necessary overpayment records and refunds in Paytrade.',
  })
  async checkAndCreateOverPaymentAndRefunds(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing information about overpayments and refunds to be created in Paytrade.',
    })
    payload: CreateOverpaymentInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for creating overpayment with arguments payload: ${JSON.stringify(payload)}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const response: any =
        await this.xeroWebhookService.checkAndCreateOverPaymentAndRefunds(
          payload,
          decoded,
        );

      this.logger.log(
        `Overpayment created successfully with data: ${JSON.stringify(response)}`,
      );
      if (response) {
        return framedResponse(
          'SUCCESS',
          'Overpayment created in paytrade successfully',
          response,
        );
      }
      return framedResponse(
        'ERROR',
        'Unable to create overpayment in paytrade',
      );
    } catch (error) {
      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }
}
