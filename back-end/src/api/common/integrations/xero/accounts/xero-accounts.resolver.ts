import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { XeroAccountsService } from './xero-accounts.service';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { StringResponse } from 'src/api/users/signup/response/auth.response';
import {
  BatchCreateAccountTypeOverrideInput,
  CompleteBankAccountDraftInput,
  GetMappedXeroAccountListsInput,
  GetPaytradeAccountListsInput,
  GetXeroAccountListsInput,
  YetToMapAccountsInput,
} from './dto/xero.input';
import {
  BatchCreateAccountsResponse,
  GetPaytradeAccountsListResponse,
  GetPaytradeAccountsResponse,
  GetXeroAccountsListResponse,
  GetXeroAccountsResponse,
} from './response/xero.response';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { AutoMapResponse } from '../xero.response';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { AddBankAccountInput } from 'src/api/users/banking/bank-accounts/bank-accounts.input';
import { XeroService } from '../xero.service';
import { XeroResolver } from '../xero.resolver';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Resolver('XeroAccounts')
export class XeroAccountsResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly xeroAccountsService: XeroAccountsService,
    private readonly xeroService: XeroService,
    private readonly xeroResolver: XeroResolver,
  ) {
    this.logger = new PaytradeLogger('XERO_ACCOUNTS_RESOLVER');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => GetXeroAccountsResponse, {
    name: 'createAccountInXero',
    description: `Creates a new bank account in Xero for the authenticated user's company.`,
  })
  async createAccountInXero(
    @Context() context,
    @Args('bank_account_id', {
      description:
        'Unique identifier of the bank account to be created in Xero.',
    })
    bank_account_id: number,
    @Args('sync_id', {
      nullable: true,
      description: 'Optional synchronization ID for Xero.',
    })
    sync_id?: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for creating account details with arguments bank_account_id: ${bank_account_id}`,
      );
      const { headers } = context.req;
      var companyId = headers?.companyid;
      var decoded = await this.jwtInternalService.decodeJwtToken(context);

      const xeroPayload = {
        bank_account_id,
        mapped_status: 'System',
        sync_id,
      };

      const response: any = await this.xeroAccountsService.createBankAccount(
        decoded,
        xeroPayload,
      );

      this.logger.log(
        `Xero Account details created successfully with data: ${JSON.stringify(response)}`,
      );

      if (response) {
        return framedResponse(
          'SUCCESS',
          'Bank Account created in Xero successfully',
          response,
        );
      }
      return framedResponse('ERROR', 'Unable to create bank account in xero');
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

      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => GetXeroAccountsResponse, {
    name: 'editAccountInXero',
    description:
      'Edits an existing bank account in Xero using the provided bank_account_id.',
  })
  async editAccountInXero(
    @Context() context,
    @Args('bank_account_id', {
      description:
        'Unique identifier of the bank account to be edited in Xero.',
    })
    bank_account_id: number,
    @Args('sync_id', {
      nullable: true,
      description: 'Optional synchronization ID for Xero.',
    })
    sync_id?: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for editing account details with arguments bank_account_id: ${bank_account_id}`,
      );
      const { headers } = context.req;
      var companyId = headers?.companyid;
      var decoded = await this.jwtInternalService.decodeJwtToken(context);

      const xeroPayload = {
        bank_account_id,
        sync_id,
      };

      const response: any = await this.xeroAccountsService.editBankAccount(
        decoded,
        xeroPayload,
      );
      this.logger.log(
        `Xero Account details edited successfully with data: ${JSON.stringify(response)}`,
      );

      if (response) {
        return framedResponse(
          'SUCCESS',
          'Bank Account edited in Xero successfully',
          response,
        );
      }
      return framedResponse('ERROR', 'Unable to edit bank account in xero');
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

      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => GetXeroAccountsResponse, {
    name: 'deleteAccountInXero',
    description: `Deletes a bank account in Xero for the authenticated user's company.`,
  })
  async deleteAccountInXero(
    @Context() context,
    @Args('bank_account_id', {
      description:
        'Unique identifier of the bank account to be deleted in Xero.',
    })
    bank_account_id: number,
    @Args('sync_id', {
      nullable: true,
      description: 'Optional synchronization ID for Xero.',
    })
    sync_id?: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for deleting account details with arguments bank_account_id: ${bank_account_id}`,
      );
      const { headers } = context.req;
      var companyId = headers?.companyid;
      var decoded = await this.jwtInternalService.decodeJwtToken(context);

      const xeroPayload = {
        bank_account_id,
        sync_id,
      };

      const response: any = await this.xeroAccountsService.deleteBankAccount(
        decoded,
        xeroPayload,
      );
      this.logger.log(
        `Xero Account details deleted successfully with data: ${JSON.stringify(response)}`,
      );

      if (response) {
        return framedResponse(
          'SUCCESS',
          'Bank Account deleted in Xero successfully',
          response,
        );
      }
      return framedResponse('ERROR', 'Unable to delete bank account in xero');
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

      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => GetPaytradeAccountsResponse, {
    name: 'createAccountInPaytrade',
    description:
      'Creates a new bank account in Paytrade for the specified company.',
  })
  async createAccountInPaytrade(
    @Context() context,
    @Args('account_id', {
      description: 'Unique identifier of the bank account in Paytrade.',
    })
    account_id: string,
    @Args('company_id', {
      description: 'ID of the company to associate the bank account with.',
    })
    company_id: number,
    @Args('sync_id', {
      nullable: true,
      description: 'Optional synchronization ID for Paytrade.',
    })
    sync_id?: string,
    @Args('payload', {
      nullable: true,
      description: 'Optional additional payload to create the bank account.',
    })
    payload?: AddBankAccountInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for creating account details with arguments account_id: ${account_id}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const xeroPayload = {
        company_id,
        account_id,
        sync_id,
        payload,
      };
      const response: any =
        await this.xeroAccountsService.insertAccountDetailsInPaytrade(
          decoded,
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
      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  // Task #122 — Returns the count the bulk action will actually try to
  // create. Frontend uses this so the confirm-dialog count and the
  // disabled-button state always match the batch eligibility.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => StringResponse, {
    name: 'getUnmappedActiveXeroAccountsCount',
    description:
      'Returns the count of unmapped active Xero bank accounts eligible for bulk-create in PayTrade.',
  })
  async getUnmappedActiveXeroAccountsCount(
    @Args('company_id', {
      description: 'ID of the company to count for.',
    })
    company_id: number,
  ): Promise<any> {
    try {
      const count =
        await this.xeroAccountsService.countUnmappedActiveXeroAccounts(
          company_id,
        );
      return framedResponse('SUCCESS', 'Count fetched', String(count));
    } catch (error) {
      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  // Task #122 — Bulk-create all unmapped active Xero bank accounts in
  // PayTrade in a single request. Mirrors `batchCreateContactsInPaytrade`.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => BatchCreateAccountsResponse, {
    name: 'batchCreateAccountsInPaytrade',
    description:
      'Creates all unmapped active Xero bank accounts in PayTrade for the specified company.',
  })
  async batchCreateAccountsInPaytrade(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company to create bank accounts for.',
    })
    company_id: number,
    // Task #123 — Optional default account type the user picked in the
    // bulk dialog. Defaults to "Cash Account" so the existing one-click
    // behaviour is preserved when the argument is omitted.
    @Args('default_account_type', {
      nullable: true,
      description:
        'Default PayTrade account type for every row (defaults to "Cash Account").',
    })
    default_account_type: string | undefined,
    // Task #123 — Optional per-row overrides so the user can mark a
    // subset of Xero rows as Project Trust / Retention Trust before
    // confirming the bulk create.
    @Args('account_type_overrides', {
      nullable: true,
      type: () => [BatchCreateAccountTypeOverrideInput],
      description:
        'Optional per-account overrides of the default account type, keyed by Xero account_id.',
    })
    account_type_overrides:
      | BatchCreateAccountTypeOverrideInput[]
      | undefined,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for batch creating bank accounts in PayTrade for company: ${company_id} (default_account_type=${
          default_account_type || 'Cash Account'
        }, overrides=${(account_type_overrides || []).length})`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const result =
        await this.xeroAccountsService.batchCreateAccountsInPaytrade(
          decoded,
          company_id,
          default_account_type,
          account_type_overrides,
        );
      this.logger.log(
        `Batch create bank accounts in PayTrade completed: ${result.created} created, ${result.skipped} skipped, ${result.failed} failed`,
      );
      return framedResponse(
        'SUCCESS',
        `Created ${result.created} bank accounts in PayTrade (${result.skipped} skipped, ${result.failed} failed)`,
        result,
      );
    } catch (error) {
      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => StringResponse, {
    name: 'getBankAccountByAccountId',
    description:
      'Fetches bank account details using the account_id for a specific company.',
  })
  async getBankAccountByAccountId(
    @Context() context,
    @Args('account_id', {
      description: 'Unique account identifier to fetch bank details.',
    })
    account_id: string,
    @Args('company_id', {
      description: 'ID of the company to which the account belongs.',
    })
    company_id: number,
  ): Promise<any> {
    try {
      const { headers } = context.req;
      var companyId = headers?.companyid;
      var decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response = await this.xeroAccountsService.getBankAccountByAccountId(
        account_id,
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

      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => AutoMapResponse, {
    name: 'syncAllBankAccountsByCompanyId',
    description:
      'Synchronizes all bank accounts for the specified company from Xero.',
  })
  async syncAllBankAccountsByCompanyId(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company whose accounts will be synchronized.',
    })
    company_id: number,
  ): Promise<any> {
    try {
      var decoded = await this.jwtInternalService.decodeJwtToken(context);
      return await this.xeroAccountsService.syncAllBankAccountsByCompanyId(
        decoded,
        company_id,
      );
      // return framedResponse('SUCCESS', response);
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
  @Query(() => GetXeroAccountsListResponse, {
    name: 'getXeroBankAccountListsForCompany',
    description:
      'Retrieves a list of all Xero bank accounts for the given company.',
  })
  async getXeroBankAccountListsForCompany(
    @Args('payload', {
      description:
        'Input payload containing company identifier, pagination, filters, and sync status to retrieve Xero bank accounts.',
    })
    payload: GetXeroAccountListsInput,
  ) {
    try {
      this.logger.log(
        `Request received for getting account lists: ${JSON.stringify(payload)}`,
      );
      const accountLists =
        await this.xeroAccountsService.getXeroBankAccountListsForCompany(
          payload,
        );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(accountLists)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Fetched bank accounts successfully`,
        accountLists,
      );
    } catch (error) {
      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => GetPaytradeAccountsListResponse, {
    name: 'getPaytradeAccountListsForCompany',
    description:
      'Retrieves a list of all Paytrade bank accounts for the given company.',
  })
  async getPaytradeAccountListsForCompany(
    @Args('payload', {
      description:
        'Input payload containing company identifier, pagination, and filters to retrieve Paytrade bank accounts.',
    })
    payload: GetPaytradeAccountListsInput,
  ) {
    try {
      this.logger.log(
        `Request received for getting account lists: ${JSON.stringify(payload)}`,
      );
      const accountLists =
        await this.xeroAccountsService.getPaytradeAccountListsForCompany(
          payload,
        );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(accountLists)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Fectched bank accounts successfully`,
        accountLists,
      );
    } catch (error) {
      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => GetXeroAccountsListResponse, {
    name: 'getMappedAccountLists',
    description:
      'Fetches a list of Xero bank accounts that have been mapped to company accounts.',
  })
  async getMappedAccountLists(
    @Args('payload', {
      description:
        'Input payload containing company identifier and filters to fetch mapped Xero bank accounts.',
    })
    payload: GetMappedXeroAccountListsInput,
  ) {
    try {
      this.logger.log(
        `Request received for getting account lists: ${JSON.stringify(payload)}`,
      );
      const accountLists =
        await this.xeroAccountsService.getMappedAccountLists(payload);
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(accountLists)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Fetched mapped bank accounts successfully`,
        accountLists,
      );
    } catch (error) {
      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'manualMappingAccount',
    description:
      'Allows manual mapping of unmapped bank accounts to company accounts.',
  })
  async manualMappingAccount(
    @Context() context,
    @Args('payload', {
      description:
        'Input payload containing bank account mapping details for manual association with company accounts.',
    })
    payload: YetToMapAccountsInput,
  ) {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const { headers } = context.req;
      const companyId = headers?.companyid;
      const response = await this.xeroAccountsService.manualMappingAccount(
        payload,
        companyId,
        decoded,
      );
      return framedResponse('SUCCESS', response);
    } catch (error) {
      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => AutoMapResponse, {
    name: 'autoMappingAccount',
    description:
      'Automatically maps all unmapped bank accounts for the given company.',
  })
  async autoMappingAccount(
    @Context() context,
    @Args('company_id', {
      description:
        'ID of the company for which bank accounts will be auto-mapped.',
    })
    company_id: number,
  ) {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      return await this.xeroAccountsService.autoMappingAccount(
        company_id,
        decoded,
      );
    } catch (error) {
      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'unMappingAccount',
    description:
      'Removes the mapping of a bank account from the company accounts.',
  })
  async unMappingAccount(
    @Context() context,
    @Args('account_id', {
      description: 'Unique identifier of the bank account to unmap.',
    })
    account_id: string,
  ) {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const { headers } = context.req;
      const companyId = headers?.companyid;
      const response = await this.xeroAccountsService.unMappingAccount(
        account_id,
        companyId,
        decoded,
      );
      return framedResponse('SUCCESS', response);
    } catch (error) {
      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'skipXeroAutoCreate',
    description: 'Marks a bank account to skip automatic creation in Xero.',
  })
  async skipXeroAutoCreate(
    @Context() context,
    @Args('bank_account_id', { description: 'The PayTrade bank account ID' })
    bank_account_id: number,
  ) {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      return await this.xeroAccountsService.markSkipXeroAutoCreate(
        decoded,
        bank_account_id,
      );
    } catch (error) {
      return framedResponse(
        'ERROR',
        error?.message ? error.message : error,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'completeBankAccountDraft',
    description: 'Completes a draft bank account with the required missing fields and activates it.',
  })
  async completeBankAccountDraft(
    @Context() context,
    @Args('input', {
      description: 'Payload containing the required fields to complete the draft bank account.',
    })
    input: CompleteBankAccountDraftInput,
  ) {
    let decoded;
    try {
      decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response = await this.xeroAccountsService.completeBankAccountDraft(
        decoded,
        input,
      );
      return response;
    } catch (error) {
      this.logger.error(
        `Error completing bank account draft: ${error.message || error}`,
      );

      const isRefreshToken = this.xeroResolver.refreshTokenReAuthenticate({
        error,
      });
      if (isRefreshToken) {
        try {
          return await this.xeroAccountsService.completeBankAccountDraft(
            decoded,
            input,
          );
        } catch (retryError) {
          return framedResponse(
            'ERROR',
            retryError.message ? retryError.message : retryError,
          );
        }
      }

      return framedResponse(
        'ERROR',
        error.message ? error.message : error,
      );
    }
  }
}
