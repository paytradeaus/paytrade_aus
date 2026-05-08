import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { XeroService } from './xero.service';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { StringResponse } from 'src/api/users/signup/response/auth.response';
import { Inject, UseGuards, forwardRef } from '@nestjs/common';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { Role } from 'src/api/auth/role-guard/role.enum';
import {
  DashboardCountResponse,
  GetAccountCodesResponse,
  GetSyncLogsResponse,
  GetTaxRateResponse,
  GetTrackingCategoryListResponse,
  GetXeroResponse,
  IntegrationIssuesResponse,
  OrganisationResponse,
  ViewSyncLogResponse,
} from './xero.response';
import {
  CreateAccountInput,
  CreateTaxTypeInput,
  CreateXeroSyncLogInput,
  GetAccountCodesInput,
  GetTaxTypeInput,
  GetXeroSyncLogsInput,
  UpdateSettingsInput,
} from './xero.input';
import { handleError } from '../../error-handler';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { jwtConstants } from 'src/api/auth/constants';
import * as jwt from 'jsonwebtoken';
import { PaymentGatewayService } from '../../payment-gateway/payment-gateway.service';
import { XeroWebhookService } from '../../xero-webhooks/webhook.service';

@Resolver('Xero')
export class XeroResolver {
  private logger: PaytradeLogger;
  private readonly jwtSecret = jwtConstants.secret;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly xeroService: XeroService,
    private readonly paymentGatewayService: PaymentGatewayService,
    @Inject(forwardRef(() => XeroWebhookService))
    private readonly xeroWebhookService: XeroWebhookService,
  ) {
    this.logger = new PaytradeLogger('XERO_RESOLVER');
  }

  public refreshTokenReAuthenticate({ error }: { error: any }) {
    return (
      typeof error === 'string' &&
      (error === 'Refresh token invalid or expired. Need to re-authenticate.' ||
        error === `AuthenticationUnsuccessful` ||
        error?.includes('TokenExpired: token expired'))
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => StringResponse, {
    name: 'getAuthUrl',
    description:
      'Generates the Xero authorization URL for a company after checking subscription eligibility.',
  })
  async getAuthUrl(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company for which to generate the Xero auth URL.',
    })
    company_id: number,
  ) {
    try {
      this.logger.log(`Request recieved while entering the client.`);
      const { headers } = context.req;
      const authorizationHeader = headers.authorization;
      const token = authorizationHeader?.split(' ')[1];

      const decoded: any = jwt.verify(token, this.jwtSecret);
      const userid = decoded.userId;
      const isadmin = decoded.isAdmin;
      const timezone = decoded.timezone;

      const subscriptionDetails =
        await this.paymentGatewayService.getSubscriptionDetailsByCompanyId(
          company_id,
        );
      const subscriptionItemForRestriction =
        subscriptionDetails &&
        subscriptionDetails?.plan_items &&
        subscriptionDetails?.plan_items?.length > 0
          ? subscriptionDetails?.plan_items?.filter(
              (item) => item?.item_name === 'Xero Integration',
            )
          : [];
      if (
        !subscriptionDetails?.is_free_plan_eligible &&
        (!subscriptionItemForRestriction ||
          (subscriptionItemForRestriction &&
            subscriptionItemForRestriction?.length > 0 &&
            subscriptionItemForRestriction[0]?.limit_value != 'true'))
      ) {
        return framedResponse(
          'WARNING',
          `Xero cannot be integrated. Please upgrade your subscription plan.`,
        );
      }

      const response = await this.xeroService.getAuthUrl(
        company_id,
        userid,
        isadmin,
        timezone,
      );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(response)}`,
      );
      return framedResponse('SUCCESS', response);
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'disconnectFromXero',
    description: 'Disconnects or deletes the Xero connection for a given ID.',
  })
  async disconnectFromXero(
    @Context() context,
    @Args('id', {
      description: 'ID of the Xero connection to disconnect or delete.',
    })
    id: string,
    @Args('type', {
      description: 'Action type: either "disconnect" or "delete".',
    })
    type: 'disconnect' | 'delete',
  ) {
    try {
      const { headers } = context.req;
      var companyId = headers?.companyid;
      var decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response = await this.xeroService.disconnectFromXero(
        decoded,
        id,
        type,
      );
      if (response) {
        return framedResponse(
          'SUCCESS',
          `${type === 'disconnect' ? 'Disconnected' : 'Deleted'} the xero connection successfully`,
        );
      }
      return framedResponse(
        'ERROR',
        `Unable to ${type === 'disconnect' ? 'disconnect' : 'delete'} the Xero connection`,
      );
    } catch (error) {
      const isRefreshToken = this.refreshTokenReAuthenticate({
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
    name: 'pauseOrUnpauseXero',
    description: 'Pauses or unpauses a Xero connection by ID.',
  })
  async pauseOrUnpauseXero(
    @Context() context,
    @Args('id', {
      description: 'ID of the Xero connection to pause or unpause.',
    })
    id: string,
    @Args('is_paused', {
      description:
        'Boolean indicating whether to pause (true) or unpause (false) the connection.',
    })
    is_paused: boolean,
  ) {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response = await this.xeroService.pauseOrUnpauseXero(
        decoded,
        id,
        is_paused,
      );
      if (response) {
        return framedResponse(
          'SUCCESS',
          `${is_paused ? 'Paused' : 'Re-established'} the xero connection successfully`,
        );
      }
      return framedResponse(
        'ERROR',
        `Unable to ${is_paused ? 'pause' : 're-establish'} from Xero`,
      );
    } catch (error) {
      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => StringResponse, {
    name: 'getAllTenants',
    description: 'Fetches all Xero tenants.',
  })
  async getAllTenants(): Promise<any> {
    try {
      const tenants = await this.xeroService.getAllTenants();
      return framedResponse('SUCCESS', JSON.stringify(tenants));
    } catch (error) {
      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => OrganisationResponse, {
    name: 'getOrganisation',
    description:
      'Fetches the organisation details for the company associated with the request.',
  })
  async getOrganisation(@Context() context) {
    try {
      this.logger.log(`Request received for getting the organisation code`);
      const { headers } = context.req;
      var companyId = headers?.companyid;
      var decoded = await this.jwtInternalService.decodeJwtToken(context);

      const response = await this.xeroService.getOrganisation(companyId);
      this.logger.log(
        `Response received while leaving the client: ${JSON.stringify(response)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Fetched organisation code successfully`,
        response,
      );
    } catch (error) {
      this.logger.error(
        `Errored while getting the organisation code with message: ${error.message}`,
      );

      const isRefreshToken = this.refreshTokenReAuthenticate({
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
          return framedResponse('ERROR', error.message ? error.message : error);
        }
      }

      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'createTrackingCategory',
    description: 'Creates a new tracking category in Xero for a company.',
  })
  async createTrackingCategory(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company to create the tracking category for.',
    })
    company_id: number,
    @Args('category_name', {
      description: 'Name of the tracking category to create.',
    })
    category_name: string,
  ) {
    try {
      var decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response = await this.xeroService.createTrackingCategory(
        company_id,
        category_name,
      );
      return framedResponse(
        'SUCCESS',
        `Tracking category created successfully`,
      );
    } catch (error) {
      const isRefreshToken = this.refreshTokenReAuthenticate({
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
          return framedResponse('ERROR', error.message ? error.message : error);
        }
      }

      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'createTrackingOptions',
    description: 'Creates a tracking option under a tracking category in Xero.',
  })
  async createTrackingOptions(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company for the tracking option.',
    })
    company_id: number,
    @Args('type', {
      description: 'Type of tracking category this option belongs to.',
    })
    type: string,
    @Args('name', { description: 'Name of the tracking option.' }) name: string,
  ) {
    try {
      var decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response = await this.xeroService.createTrackingOptions({
        company_id,
        type,
        name,
      });
      return framedResponse(
        'SUCCESS',
        `Tracking category id ${response} created successfully`,
      );
    } catch (error) {
      const isRefreshToken = this.refreshTokenReAuthenticate({
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
          return framedResponse('ERROR', error.message ? error.message : error);
        }
      }
      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => GetTrackingCategoryListResponse, {
    name: 'getTrackingCategories',
    description: 'Fetches all tracking categories for a given company.',
  })
  async getTrackingCategories(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company to fetch tracking categories for.',
    })
    company_id: number,
  ): Promise<any> {
    try {
      var decoded = await this.jwtInternalService.decodeJwtToken(context);

      const trackingDetails =
        await this.xeroService.getTrackingCategories(company_id);
      return framedResponse(
        'SUCCESS',
        `Fetched Tracking Category list successfully`,
        trackingDetails,
      );
    } catch (error) {
      const isRefreshToken = this.refreshTokenReAuthenticate({
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
          return framedResponse('ERROR', error.message ? error.message : error);
        }
      }

      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => GetXeroResponse, {
    name: 'getXeroDetailsForCompany',
    description:
      'Fetches Xero connection details for a company by Xero connection ID.',
  })
  async getXeroDetailsForCompany(
    @Context() context,
    @Args('id', { description: 'ID of the Xero connection.' }) id: string,
  ): Promise<any> {
    try {
      const { headers } = context.req;
      const authorizationHeader = headers.authorization;
      const token = authorizationHeader?.split(' ')[1];

      const decoded: any = jwt.verify(token, this.jwtSecret);
      var userid = decoded.userId;
      var isadmin = decoded.isAdmin;
      var timezone = decoded.timezone;
      var company_id = headers?.companyid;

      const xeroDetails = await this.xeroService.getXeroDetailsForCompany(id);
      return framedResponse(
        'SUCCESS',
        `Fetched Xero details successfully`,
        xeroDetails,
      );
    } catch (error) {
      const isRefreshToken = this.refreshTokenReAuthenticate({
        error,
      });

      if (isRefreshToken) {
        try {
          const response = await this.xeroService.getAuthUrl(
            company_id,
            userid,
            isadmin,
            timezone,
          );

          return framedResponse('XERO_REFRESH', response);
        } catch (error) {
          return framedResponse('ERROR', error.message ? error.message : error);
        }
      }

      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'deleteTrackingCategory',
    description: 'Deletes a tracking category from Xero for a given company.',
  })
  async deleteTrackingCategory(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company associated with the category.',
    })
    company_id: number,
    @Args('category_id', {
      description: 'ID of the tracking category to delete.',
    })
    category_id: string,
  ) {
    try {
      var decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response = await this.xeroService.deleteTrackingCategory(
        company_id,
        category_id,
      );
      return framedResponse(
        'SUCCESS',
        `Tracking category name ${response.name} deleted successfully`,
      );
    } catch (error) {
      const isRefreshToken = this.refreshTokenReAuthenticate({
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
          return framedResponse('ERROR', error.message ? error.message : error);
        }
      }

      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'skipContractMapping',
    description: 'Skips contract mapping for a company in Xero.',
  })
  async skipContractMapping(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company to skip contract mapping for.',
    })
    company_id: number,
  ) {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response = await this.xeroService.skipContractMapping(
        decoded,
        company_id,
      );
      if (response?.affected > 0) {
        return framedResponse(
          'SUCCESS',
          `Skipped contract mapping successfully`,
        );
      }
      throw `Unable to skip contract mapping`;
    } catch (error) {
      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'checkTrackingCategoryId',
    description:
      'Checks if a tracking category exists for a given type (project or contract) in a company.',
  })
  async checkTrackingCategoryId(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company to check for the tracking category.',
    })
    company_id: number,
    @Args('category_type', {
      description: 'Type of category to check: "project" or "contract".',
    })
    category_type: 'project' | 'contract',
  ) {
    try {
      var decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response = await this.xeroService.checkTrackingCategoryId(
        decoded,
        company_id,
        category_type,
      );
      return framedResponse(
        'SUCCESS',
        `Tracking category id for ${category_type} checked successfully`,
      );
    } catch (error) {
      const isRefreshToken = this.refreshTokenReAuthenticate({
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
          return framedResponse('ERROR', error.message ? error.message : error);
        }
      }

      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => DashboardCountResponse, {
    name: 'getXeroDashboardCountForCompany',
    description:
      "Fetches dashboard count statistics for a company's Xero data.",
  })
  async getXeroDashboardCountForCompany(
    @Args('company_id', {
      description: 'ID of the company to fetch dashboard counts for.',
    })
    company_id: number,
  ): Promise<any> {
    try {
      const xeroDetails =
        await this.xeroService.getXeroDashboardCountForCompany(company_id);
      return framedResponse(
        'SUCCESS',
        `Fetched Xero count details successfully`,
        xeroDetails,
      );
    } catch (error) {
      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => IntegrationIssuesResponse, {
    name: 'getIntegrationIssuesForDashboard',
  })
  async getIntegrationIssuesForDashboard(
    @Args('company_id') company_id: number,
  ): Promise<any> {
    try {
      const result =
        await this.xeroService.getIntegrationIssuesForDashboard(company_id);
      return framedResponse(
        'SUCCESS',
        'Fetched integration issues successfully',
        result,
      );
    } catch (error) {
      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => StringResponse, {
    name: 'insertXeroSyncLogs',
    description:
      'Inserts a new Xero sync log entry for auditing and tracking purposes.',
  })
  async insertXeroSyncLogs(
    @Context() context,
    @Args('createXeroSyncLogInput', {
      description:
        'Payload containing details for creating a new Xero sync log entry.',
    })
    createXeroSyncLogInput: CreateXeroSyncLogInput,
  ) {
    try {
      this.logger.log(
        `Request received for inserting the sync log with data: ${JSON.stringify(createXeroSyncLogInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const syncLogResponse = await this.xeroService.insertXeroSyncLogs(
        decoded,
        createXeroSyncLogInput,
      );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(syncLogResponse)}`,
      );
      if (syncLogResponse) {
        return framedResponse(
          'SUCCESS',
          `Sync Log inserted successfully`,
          syncLogResponse,
        );
      }
      return framedResponse('ERROR', `Error in insertion of sync logs`);
    } catch (error) {
      this.logger.error(
        `Errored while inserting the sync log with message: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => GetSyncLogsResponse, {
    name: 'getXeroSyncLogs',
    description:
      'Fetches Xero sync logs with filtering and pagination support.',
  })
  async getXeroSyncLogs(
    @Context() context,
    @Args('getXeroSyncLogsInput', {
      description:
        'Payload containing filters and pagination options for fetching Xero sync logs.',
    })
    getXeroSyncLogsInput: GetXeroSyncLogsInput,
  ) {
    try {
      this.logger.log(
        `Request received for getting the sync log with input: ${JSON.stringify(getXeroSyncLogsInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const timezone = decoded?.timezone || 'UTC';
      const getSyncLogRes = await this.xeroService.getXeroSyncLogs(
        getXeroSyncLogsInput,
        timezone,
      );
      this.logger.log(
        `Response received while leaving the client: ${JSON.stringify(getSyncLogRes)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Fetched Xero logs successfully`,
        getSyncLogRes,
      );
    } catch (error) {
      this.logger.error(
        `Errored while getting the sync log with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while getting the sync log with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => ViewSyncLogResponse, {
    name: 'viewXeroSyncLog',
    description: 'Fetches a single Xero sync log entry by ID.',
  })
  async viewXeroSyncLog(
    @Context() context,
    @Args('id', { description: 'ID of the sync log entry to view.' })
    id: string,
  ) {
    try {
      this.logger.log(
        `Request received for getting the sync log with input: ${id}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const getSyncLogRes = await this.xeroService.viewXeroSyncLog(id);
      this.logger.log(
        `Response received while leaving the client: ${JSON.stringify(getSyncLogRes)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Fetched Xero log successfully`,
        getSyncLogRes,
      );
    } catch (error) {
      this.logger.error(
        `Errored while getting the sync log with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while getting the sync log with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => GetAccountCodesResponse, {
    name: 'getAccountCodes',
    description: 'Fetches Xero account codes for a company.',
  })
  async getAccountCodes(
    @Context() context,
    @Args('getAccountCodesInput', {
      description:
        'Payload containing company and filter details for fetching Xero account codes.',
    })
    getAccountCodesInput: GetAccountCodesInput,
  ) {
    try {
      this.logger.log(
        `Request received for getting the account codes with input: ${JSON.stringify(getAccountCodesInput)}`,
      );
      const { headers } = context.req;
      var company_id = headers?.companyid;
      var decoded = await this.jwtInternalService.decodeJwtToken(context);

      const response =
        await this.xeroService.getAccountCodes(getAccountCodesInput);
      this.logger.log(
        `Response received while leaving the client: ${JSON.stringify(response)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Fetched account codes successfully`,
        response,
      );
    } catch (error) {
      this.logger.error(
        `Errored while getting the account code with message: ${error.message}`,
      );
      const isRefreshToken = this.refreshTokenReAuthenticate({
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
          return framedResponse('ERROR', error.message ? error.message : error);
        }
      }

      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'createAccount',
    description: 'Creates a new Xero account for a company.',
  })
  async createAccount(
    @Context() context,
    @Args('createAccountInput', {
      description:
        'Payload containing the details required to create a new Xero account for a company.',
    })
    createAccountInput: CreateAccountInput,
  ) {
    try {
      this.logger.log(
        `Request received for creating account with input:  ${JSON.stringify(createAccountInput)}`,
      );
      var decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response = await this.xeroService.createAccount(createAccountInput);
      this.logger.log(
        `Response received while leaving the client: ${JSON.stringify(response)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Created account successfully`,
        response,
      );
    } catch (error) {
      this.logger.error(
        `Errored while creating the account with message: ${error.message}`,
      );

      const isRefreshToken = this.refreshTokenReAuthenticate({
        error,
      });

      if (isRefreshToken) {
        try {
          const response = await this.xeroService.getAuthUrl(
            createAccountInput?.company_id,
            decoded?.userId,
            decoded?.isAdmin,
            decoded?.timezone,
          );

          return framedResponse('XERO_REFRESH', response);
        } catch (error) {
          return framedResponse('ERROR', error.message ? error.message : error);
        }
      }

      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => GetTaxRateResponse, {
    name: 'getTaxRates',
    description: 'Fetches Xero tax rates for a company.',
  })
  async getTaxRates(
    @Context() context,
    @Args('getTaxTypeInput', {
      description:
        'Payload containing company ID and filter options to fetch Xero tax rates.',
    })
    getTaxTypeInput: GetTaxTypeInput,
  ) {
    try {
      this.logger.log(
        `Request received for getting the tax rate with input: ${JSON.stringify(getTaxTypeInput)}`,
      );
      var decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response = await this.xeroService.getTaxRates(getTaxTypeInput);
      this.logger.log(
        `Response received while leaving the client: ${JSON.stringify(response)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Fetched tax rate type successfully`,
        response,
      );
    } catch (error) {
      this.logger.error(
        `Errored while getting the tax rate type with message: ${error.message}`,
      );

      const isRefreshToken = this.refreshTokenReAuthenticate({
        error,
      });

      if (isRefreshToken) {
        try {
          const response = await this.xeroService.getAuthUrl(
            getTaxTypeInput?.company_id,
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

      this.logger.log(
        `Error ${error.message ? 'msg' : ''}: ${error.message ? error.message : error}`,
      );

      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'createTaxRates',
    description: 'Creates new tax rates in Xero.',
  })
  async createTaxRates(
    @Context() context,
    @Args('createTaxTypeInput', {
      description:
        'Payload containing details for creating new tax rates in Xero.',
    })
    createTaxTypeInput: CreateTaxTypeInput,
  ) {
    try {
      this.logger.log(
        `Request received for creating tax rate with input:  ${JSON.stringify(createTaxTypeInput)}`,
      );
      var decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response =
        await this.xeroService.createTaxRates(createTaxTypeInput);
      this.logger.log(
        `Response received while leaving the client: ${JSON.stringify(response)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Created tax rate type successfully`,
        response,
      );
    } catch (error) {
      this.logger.error(
        `Errored while creating the tax rate type with message: ${error.message}`,
      );

      const isRefreshToken = this.refreshTokenReAuthenticate({
        error,
      });

      if (isRefreshToken) {
        try {
          const response = await this.xeroService.getAuthUrl(
            createTaxTypeInput?.company_id,
            decoded?.userId,
            decoded?.isAdmin,
            decoded?.timezone,
          );

          return framedResponse('XERO_REFRESH', response);
        } catch (error) {
          return framedResponse('ERROR', error.message ? error.message : error);
        }
      }

      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'updateSettings',
    description: 'Updates Xero integration settings for a company.',
  })
  async updateSettings(
    @Context() context,
    @Args('updateSettingsInput', {
      description:
        'Payload containing the Xero integration settings to be updated for a company.',
    })
    updateSettingsInput: UpdateSettingsInput,
  ) {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response = await this.xeroService.updateSettings(
        decoded,
        updateSettingsInput,
      );
      return framedResponse('SUCCESS', `Settings updated successfully`);
    } catch (error) {
      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'setSupplierXeroAccountCode',
    description:
      'Task #41 — Set or clear the Xero account code override for a supplier (project_id null) or supplier × project pair.',
  })
  async setSupplierXeroAccountCode(
    @Context() context,
    @Args('client_supplier_id', { type: () => Number })
    client_supplier_id: number,
    @Args('account_code', { nullable: true }) account_code: string,
    @Args('project_id', { nullable: true, type: () => Number })
    project_id: number,
  ) {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      await this.xeroService.setSupplierXeroAccountCode(decoded, {
        client_supplier_id,
        project_id: project_id ?? null,
        account_code: account_code ?? null,
      });
      return framedResponse('SUCCESS', 'Supplier Xero account code updated');
    } catch (error) {
      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'updateTrackingCategory',
    description:
      'Updates a tracking category mapping for a project or contract in Xero.',
  })
  async updateTrackingCategory(
    @Context() context,
    @Args('id', { description: 'ID of the project or contract to update.' })
    id: string,
    @Args('category_id', {
      description: 'ID of the tracking category to assign.',
    })
    category_id: string,
    @Args('category_type', {
      description: 'Type of the category: "project" or "contract".',
    })
    category_type: 'project' | 'contract',
  ) {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response = await this.xeroService.updateTrackingCategory(
        decoded,
        id,
        category_id,
        category_type,
      );
      return framedResponse(
        'SUCCESS',
        `Tracking category updated successfully`,
      );
    } catch (error) {
      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  /**
   * Task #65 — Manual Xero re-sync by ID.
   *
   * Admin-driven recovery: pulls the named record fresh from Xero and
   * re-runs the matching inbound webhook handler stamped with
   * `sync_run_type: 'manual'`. Returns a JSON-stringified
   * `{ success, message, syncLogId, resolvedXeroId }` payload via the
   * standard StringResponse so the frontend can show inline result text
   * and a sync log id link.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'manualXeroResync',
    description:
      'Admin-only: re-pull a single Xero record by ID (or invoice number) and re-run the matching webhook handler.',
  })
  async manualXeroResync(
    @Context() context,
    @Args('company_id', { description: 'Company id of the calling user.' })
    company_id: number,
    @Args('type', {
      description:
        'One of: invoice_bill, payment, bank_transfer, contact, manual_journal',
    })
    type: string,
    @Args('id', {
      description:
        'Xero GUID of the record (or invoice/bill number for type=invoice_bill).',
    })
    id: string,
  ) {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      // IDOR guard — caller must own the company they're acting on. The
      // role-guard above only confirms the user is an admin somewhere; the
      // JWT-bound company id is what proves they're an admin of *this*
      // company. Reject any cross-company tampering attempt up front.
      const callerCompanyId =
        decoded?.companyId ?? decoded?.company_id ?? null;
      if (
        !callerCompanyId ||
        Number(callerCompanyId) !== Number(company_id)
      ) {
        return framedResponse(
          'ERROR',
          JSON.stringify({
            success: false,
            message:
              'Unauthorized: company_id does not match your active session.',
          }),
        );
      }
      const result = await this.xeroWebhookService.manualXeroResync(decoded, {
        company_id,
        type,
        id,
      });
      return framedResponse(
        result.success ? 'SUCCESS' : 'ERROR',
        JSON.stringify(result),
      );
    } catch (error: any) {
      if (this.refreshTokenReAuthenticate({ error })) {
        const decoded = await this.jwtInternalService.decodeJwtToken(context);
        const response = await this.xeroService.getAuthUrl(
          company_id,
          decoded?.userId,
          false,
          decoded?.timezone,
        );
        return framedResponse('XERO_REFRESH', response);
      }
      return framedResponse(
        'ERROR',
        JSON.stringify({
          success: false,
          message: error?.message ?? String(error),
        }),
      );
    }
  }
}
