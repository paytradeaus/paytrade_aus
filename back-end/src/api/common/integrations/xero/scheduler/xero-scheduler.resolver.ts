import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { XeroService } from '../xero.service';
import { XeroSchedulerService } from './xero-scheduler.service';
import { UseGuards } from '@nestjs/common';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { StringResponse } from 'src/api/users/signup/response/auth.response';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { AddBankAccountInput } from 'src/api/users/banking/bank-accounts/bank-accounts.input';
import { GetPaytradeAccountsResponse } from '../accounts/response/xero.response';
import { XeroResolver } from '../xero.resolver';
import { CreateClientSuppliersDetailInput } from 'src/api/users/client-suppliers-details/dto/create-client-suppliers-detail.input';
import { GetPaytradeContactsResponse } from '../contacts/response/xero.response';
import { CreateProjectInput } from 'src/api/users/projects/dto/create-project.input';
import { CreateContractDetailInput } from 'src/api/users/contract-details/dto/create-contract-detail.input';
import { GetPaytradeProjectsResponse } from '../projects/response/xero.response';
import { GetPaytradeContractsResponse } from '../contracts/response/xero.response';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Resolver('XeroScheduler')
export class XeroSchedulerResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly xeroService: XeroService,
    private readonly xeroSchedulerService: XeroSchedulerService,
    private readonly activityLogService: ActivityLogService,
    private readonly xeroResolver: XeroResolver,
  ) {
    this.logger = new PaytradeLogger('XERO_SCHEDULER_RESOLVER');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'refreshAllByCompanyId',
    description:
      'Refreshes all Xero-related data (accounts, contacts, projects, contracts) for a given company.',
  })
  async refreshAllByCompanyId(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company to refresh all Xero data for.',
    })
    company_id: number,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for refreshing all items with arguments company_id: ${company_id}`,
      );
      var decoded = await this.jwtInternalService.decodeJwtToken(context);
      const isAuthorized = await this.activityLogService.checkCompanyAuthorized(
        decoded,
        company_id,
      );
      if (!isAuthorized) throw `Unauthorized to perform this action`;
      const response = await this.xeroSchedulerService.refreshAllByCompanyId(
        decoded,
        company_id,
      );

      this.logger.log(
        `Xero refreshed successfully with data: ${JSON.stringify(response)}`,
      );

      return framedResponse(
        'SUCCESS',
        `Xero has been successfully refreshed`,
        // `Xero has been successfully refreshed with ${response?.newAccounts?.length || 0} new accounts, ${response?.newContacts?.length || 0} new contacts, ${response?.newProjects?.length || 0} new projects, and ${response?.newContracts?.length || 0} new contracts`,
        response,
      );
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
  @Mutation(() => GetPaytradeAccountsResponse, {
    name: 'createOrUpdateAccountInPaytrade',
    description:
      'Creates or updates a bank account in Paytrade for a specific company.',
  })
  async createOrUpdateAccountInPaytrade(
    @Context() context,
    @Args('account_id', {
      description: 'ID of the bank account to create or update.',
    })
    account_id: string,
    @Args('account_status', {
      description: 'Status of the bank account (e.g., active/inactive).',
    })
    account_status: string,
    @Args('company_id', {
      description: 'ID of the company associated with the account.',
    })
    company_id: number,
    @Args('sync_id', {
      nullable: true,
      description: 'Optional sync ID for Paytrade.',
    })
    sync_id?: string,
    @Args('payload', {
      nullable: true,
      description: 'Optional payload containing account details.',
    })
    payload?: AddBankAccountInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for creating account details with arguments account_id: ${account_id}`,
      );
      var decoded = await this.jwtInternalService.decodeJwtToken(context);

      const xeroPayload = {
        account_id,
        account_status,
        company_id,
        sync_id,
        decoded,
        payload,
      };
      const response: any =
        await this.xeroSchedulerService.createOrUpdateAccountInPaytrade(
          xeroPayload,
        );
      this.logger.log(
        `Paytrade Account details created successfully with data: ${JSON.stringify(response)}`,
      );
      if (response) {
        return framedResponse(
          'SUCCESS',
          'Bank account created in paytrade successfully',
          response,
        );
      }
      return framedResponse(
        'ERROR',
        'Unable to create bank account in paytrade',
      );
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

      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => GetPaytradeContactsResponse, {
    name: 'createOrUpdateContactInPaytrade',
    description:
      'Creates or updates a client or supplier contact in Paytrade for a specific company.',
  })
  async createOrUpdateContactInPaytrade(
    @Context() context,
    @Args('contact_id', {
      description: 'ID of the contact to create or update.',
    })
    contact_id: string,
    @Args('contact_status', {
      description: 'Status of the contact (e.g., active/inactive).',
    })
    contact_status: string,
    @Args('company_id', {
      description: 'ID of the company associated with the contact.',
    })
    company_id: number,
    @Args('sync_id', {
      nullable: true,
      description: 'Optional sync ID for Paytrade.',
    })
    sync_id?: string,
    @Args('payload', {
      nullable: true,
      description: 'Optional payload containing contact details.',
    })
    payload?: CreateClientSuppliersDetailInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for creating client supplier details with arguments client_supplier_id: ${contact_id}`,
      );

      var decoded = await this.jwtInternalService.decodeJwtToken(context);
      const xeroPayload = {
        contact_id,
        contact_status,
        company_id,
        sync_id,
        decoded,
        payload,
      };
      const response: any =
        await this.xeroSchedulerService.createOrUpdateContactInPaytrade(
          xeroPayload,
        );
      this.logger.log(
        `Paytrade Client supplier details created successfully with data: ${JSON.stringify(response)}`,
      );
      if (response) {
        return framedResponse(
          'SUCCESS',
          'Contact created in paytrade successfully',
          response,
        );
      }
      return framedResponse('ERROR', 'Unable to create contact in paytrade');
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
      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => GetPaytradeProjectsResponse, {
    name: 'createOrUpdateProjectInPaytrade',
    description: 'Creates or updates a project in Paytrade.',
  })
  async createOrUpdateProjectInPaytrade(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company associated with the project.',
    })
    company_id: number,
    @Args('project_id', {
      nullable: true,
      description: 'ID of the project to create or update.',
    })
    project_id?: string,
    @Args('project_status', {
      nullable: true,
      description: 'Status of the project (e.g., active/inactive).',
    })
    project_status?: string,
    @Args('sync_id', {
      nullable: true,
      description: 'Optional sync ID for Paytrade.',
    })
    sync_id?: string,
    @Args('payload', {
      nullable: true,
      description: 'Optional payload containing project details.',
    })
    payload?: CreateProjectInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for creating project details with arguments project_id: ${project_id}`,
      );

      var decoded = await this.jwtInternalService.decodeJwtToken(context);

      const response: any = !project_id
        ? await this.xeroSchedulerService.refreshProjects(
            decoded,
            company_id,
            sync_id,
          )
        : await this.xeroSchedulerService.createOrUpdateProjectInPaytrade({
            project_id,
            project_status,
            company_id,
            sync_id,
            decoded,
            payload,
          });
      this.logger.log(
        `Paytrade project details created successfully with data: ${JSON.stringify(response)}`,
      );
      if (response) {
        return framedResponse(
          'SUCCESS',
          'Project created in paytrade successfully',
          response,
        );
      }
      return framedResponse('ERROR', 'Unable to create project in paytrade');
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
      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => GetPaytradeContractsResponse, {
    name: 'createOrUpdateContractInPaytrade',
    description:
      'Creates or updates a contract in Paytrade for a specific company.',
  })
  async createOrUpdateContractInPaytrade(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company associated with the contract.',
    })
    company_id: number,
    @Args('contract_id', {
      nullable: true,
      description: 'ID of the contract to create or update.',
    })
    contract_id?: string,
    @Args('contract_status', {
      nullable: true,
      description: 'Status of the contract (e.g., active/inactive).',
    })
    contract_status?: string,
    @Args('sync_id', {
      nullable: true,
      description: 'Optional sync ID for Paytrade.',
    })
    sync_id?: string,
    @Args('payload', {
      nullable: true,
      description: 'Optional payload containing contract details.',
    })
    payload?: CreateContractDetailInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for creating contract details with arguments contract_id: ${contract_id}`,
      );

      var decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response: any = !contract_id
        ? await this.xeroSchedulerService.refreshContracts(
            decoded,
            company_id,
            sync_id,
          )
        : await this.xeroSchedulerService.createOrUpdateContractInPaytrade({
            contract_id,
            contract_status,
            company_id,
            sync_id,
            decoded,
            payload,
          });
      this.logger.log(
        `Paytrade contract details created successfully with data: ${JSON.stringify(response)}`,
      );
      if (response) {
        return framedResponse(
          'SUCCESS',
          'Contract created in paytrade successfully',
          response,
        );
      }
      return framedResponse('ERROR', 'Unable to create contract in paytrade');
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
      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'syncContactFinancialDetails',
    description:
      'Manually triggers contact financial details sync between PayTrade and Xero for all mapped contacts.',
  })
  async syncContactFinancialDetails(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company to sync contact financial details for.',
    })
    company_id: number,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const result =
        await this.xeroSchedulerService.manualSyncContactFinancialDetails(
          decoded,
          company_id,
        );
      const parts = [
        `${result.synced_to_pt} synced to PayTrade`,
        `${result.synced_to_xero} synced to Xero`,
        `${result.skipped} skipped`,
      ];
      if (result.mismatches > 0) {
        parts.push(`${result.mismatches} mismatches`);
      }
      parts.push(`${result.errors} errors`);
      const message = `Financial sync complete: ${parts.join(', ')}`;
      return framedResponse('SUCCESS', message, result);
    } catch (error) {
      if (
        this.xeroResolver.refreshTokenReAuthenticate({
          error: error?.message || error,
        })
      ) {
        try {
          const decoded = await this.jwtInternalService.decodeJwtToken(context);
          const response = await this.xeroService.getAuthUrl(
            company_id,
            decoded?.id,
            false,
            decoded?.timezone,
          );
          return framedResponse('XERO_REFRESH', response);
        } catch (refreshError) {
          return framedResponse(
            'ERROR',
            refreshError?.message ? refreshError.message : refreshError,
          );
        }
      }
      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }
}
