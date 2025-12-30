import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { StringResponse } from 'src/api/users/signup/response/auth.response';
import {
  GetMappedXeroContractListsInput,
  GetPaytradeContractListsInput,
  GetXeroContractListsInput,
  YetToMapContractsInput,
} from './dto/xero.input';
import {
  GetPaytradeContractsListResponse,
  GetPaytradeContractsResponse,
  GetXeroContractsListResponse,
  GetXeroContractsResponse,
} from './response/xero.response';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { XeroContractsService } from './xero-contracts.service';
import { AutoMapResponse } from '../xero.response';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { CreateContractDetailInput } from 'src/api/users/contract-details/dto/create-contract-detail.input';
import { XeroResolver } from '../xero.resolver';
import { XeroService } from '../xero.service';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Resolver('XeroContracts')
export class XeroContractsResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly xeroContractsService: XeroContractsService,
    private readonly xeroService: XeroService,
    private readonly xeroResolver: XeroResolver,
  ) {
    this.logger = new PaytradeLogger('XERO_CONTRACTS_RESOLVER');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => GetXeroContractsResponse, {
    name: 'createContractInXero',
    description: `Creates a new contract in Xero for the authenticated user's company.`,
  })
  async createContractInXero(
    @Context() context,
    @Args('contract_id', {
      description: 'Unique identifier of the contract to create in Xero.',
    })
    contract_id: number,
    @Args('sync_id', {
      nullable: true,
      description: 'Optional synchronization ID for Xero.',
    })
    sync_id?: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for creating contract details with arguments contract_id: ${contract_id}`,
      );
      const { headers } = context.req;
      var companyId = headers?.companyid;
      var decoded = await this.jwtInternalService.decodeJwtToken(context);

      const xeroPayload = {
        contract_id,
        mapped_status: 'System',
        sync_id,
      };

      const response: any =
        await this.xeroContractsService.createContractTrackingOptions(
          decoded,
          xeroPayload,
        );
      this.logger.log(
        `Xero Contract details created successfully with data: ${JSON.stringify(response)}`,
      );
      if (response) {
        return framedResponse(
          'SUCCESS',
          'Contract created in Xero successfully',
          response,
        );
      }
      return framedResponse('ERROR', 'Unable to create contract in xero');
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
  @Mutation(() => GetXeroContractsResponse, {
    name: 'deleteContractInXero',
    description:
      'Deletes an existing contract in Xero using the provided contract_id.',
  })
  async deleteContractInXero(
    @Context() context,
    @Args('contract_id', {
      description: 'Unique identifier of the contract to delete in Xero.',
    })
    contract_id: number,
    @Args('sync_id', {
      nullable: true,
      description: 'Optional synchronization ID for Xero.',
    })
    sync_id?: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for deleting contract details with arguments contract_id: ${contract_id}`,
      );
      const { headers } = context.req;
      var companyId = headers?.companyid;
      var decoded = await this.jwtInternalService.decodeJwtToken(context);

      const xeroPayload = {
        contract_id,
        sync_id,
      };

      const response: any =
        await this.xeroContractsService.deleteContractTrackingOptions(
          decoded,
          xeroPayload,
        );
      this.logger.log(
        `Xero Contract details deleted successfully with data: ${JSON.stringify(response)}`,
      );
      if (response) {
        return framedResponse(
          'SUCCESS',
          'Contract deleted in Xero successfully',
          response,
        );
      }
      return framedResponse('ERROR', 'Unable to delete contract in xero');
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
  @Mutation(() => GetPaytradeContractsResponse, {
    name: 'createContractInPaytrade',
    description:
      'Creates a new contract in Paytrade for the specified company.',
  })
  async createContractInPaytrade(
    @Context() context,
    @Args('contract_id', {
      description: 'Unique identifier of the contract to create in Paytrade.',
    })
    contract_id: string,
    @Args('company_id', {
      description: 'ID of the company to associate the contract with.',
    })
    company_id: number,
    @Args('sync_id', {
      nullable: true,
      description: 'Optional synchronization ID for Paytrade.',
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
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const xeroPayload = {
        company_id,
        contract_id,
        sync_id,
        payload,
      };
      const response: any =
        await this.xeroContractsService.insertContractDetailsInPaytrade(
          decoded,
          xeroPayload,
        );
      this.logger.log(
        `Paytrade Client supplier details created successfully with data: ${JSON.stringify(response)}`,
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
      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => StringResponse, {
    name: 'getContractByContractId',
    description:
      'Fetches a contract from Xero by contract_id for the specified company.',
  })
  async getContractByContractId(
    @Context() context,
    @Args('contract_id', {
      description: 'Unique identifier of the contract to fetch.',
    })
    contract_id: string,
    @Args('company_id', {
      description: 'ID of the company to which the contract belongs.',
    })
    company_id: number,
  ): Promise<any> {
    try {
      var decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response = await this.xeroContractsService.getContractByContractId(
        contract_id,
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
  @Mutation(() => AutoMapResponse, {
    name: 'syncAllContractsByCompanyId',
    description:
      'Synchronizes all contracts from Xero for the specified company.',
  })
  async syncAllContractsByCompanyId(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company whose contracts will be synchronized.',
    })
    company_id: number,
    @Args('sync_id', {
      nullable: true,
      description: 'Optional synchronization ID for Xero.',
    })
    sync_id?: string,
  ): Promise<any> {
    try {
      var decoded = await this.jwtInternalService.decodeJwtToken(context);
      return await this.xeroContractsService.syncAllContractsByCompanyId(
        decoded,
        company_id,
        sync_id,
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

      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => GetXeroContractsListResponse, {
    name: 'getXeroContractListsForCompany',
    description:
      'Retrieves a list of all Xero contracts for the given company.',
  })
  async getXeroContractListsForCompany(
    @Args('payload', {
      description:
        'Input payload containing company identifier, pagination, filters, and sync status to retrieve Xero contracts.',
    })
    payload: GetXeroContractListsInput,
  ) {
    try {
      this.logger.log(
        `Request received for getting contract lists: ${JSON.stringify(payload)}`,
      );
      const contractLists =
        await this.xeroContractsService.getXeroContractListsForCompany(payload);
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(contractLists)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Fetched contracts successfully`,
        contractLists,
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
  @Query(() => GetPaytradeContractsListResponse, {
    name: 'getPaytradeContractListsForCompany',
    description:
      'Retrieves a list of all Paytrade contracts for the given company.',
  })
  async getPaytradeContractListsForCompany(
    @Args('payload', {
      description:
        'Input payload containing company identifier, pagination, and filters to retrieve Paytrade contacts.',
    })
    payload: GetPaytradeContractListsInput,
  ) {
    try {
      this.logger.log(
        `Request received for getting contract lists: ${JSON.stringify(payload)}`,
      );
      const contractLists =
        await this.xeroContractsService.getPaytradeContractListsForCompany(
          payload,
        );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(contractLists)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Fetched contracts successfully`,
        contractLists,
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
  @Query(() => GetXeroContractsListResponse, {
    name: 'getMappedContractLists',
    description:
      'Fetches a list of Xero contracts that have been mapped to company contracts.',
  })
  async getMappedContractLists(
    @Args('payload', {
      description:
        'Input payload containing company identifier and filters to fetch mapped Xero contracts.',
    })
    payload: GetMappedXeroContractListsInput,
  ) {
    try {
      this.logger.log(
        `Request received for getting contract lists: ${JSON.stringify(payload)}`,
      );
      const contractLists =
        await this.xeroContractsService.getMappedContractLists(payload);
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(contractLists)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Fetched mapped contracts successfully`,
        contractLists,
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
    name: 'manualMappingContract',
    description: 'Manually maps unmapped contracts to company contracts.',
  })
  async manualMappingContract(
    @Context() context,
    @Args('payload', {
      description:
        'Input payload containing contract mapping details for manual association with company contracts.',
    })
    payload: YetToMapContractsInput,
  ) {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const { headers } = context.req;
      const companyId = headers?.companyid;
      const response = await this.xeroContractsService.manualMappingContract(
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
  @Mutation(() => AutoMapResponse, {
    name: 'autoMappingContract',
    description:
      'Automatically maps all unmapped contracts for the specified company.',
  })
  async autoMappingContract(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company whose contracts will be auto-mapped.',
    })
    company_id: number,
  ) {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      return await this.xeroContractsService.autoMappingContract(
        company_id,
        decoded,
      );
    } catch (error) {
      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'unMappingContract',
    description:
      'Removes the mapping of a contract from the company contracts.',
  })
  async unMappingContract(
    @Context() context,
    @Args('contract_id', {
      description: 'Unique identifier of the contract to unmap.',
    })
    contract_id: string,
  ) {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const { headers } = context.req;
      const companyId = headers?.companyid;
      const response = await this.xeroContractsService.unMappingContract(
        contract_id,
        companyId,
        decoded,
      );
      return framedResponse('SUCCESS', response);
    } catch (error) {
      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }
}
