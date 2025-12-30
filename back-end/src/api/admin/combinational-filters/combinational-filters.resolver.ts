import { UseGuards } from '@nestjs/common';
import { Args, Query, Mutation, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { AdminCombinationalFiltersService } from './combinational-filters.service';
import {
  GetFiltersForComplianceAdminResponse,
  GetFiltersForNoticeAdminResponse,
  GetFiltersForTAadminResponse,
} from './combinational-filters.response';
import {
  FetchFiltersForComplianceInput,
  FetchFiltersForNoticeInput,
  FetchFiltersForTrustAccountingInput,
} from './combinational-filters.input';

@Resolver()
export class AdminCombinationalFiltersResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly adminCombinationalFiltersService: AdminCombinationalFiltersService,
  ) {
    this.logger = new PaytradeLogger('ADMIN_COMBINATIONAL_FILTERS_RESOLVER');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => GetFiltersForTAadminResponse, {
    name: 'fetchFiltersForAdminTrustAccounting',
    description: `Fetches combinational filters for trust accounting in admin dashboard.`,
  })
  async fetchFiltersForAdminTrustAccounting(
    @Args('payload', {
      description: 'Input parameters for fetching trust accounting filters',
    })
    payload: FetchFiltersForTrustAccountingInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received while fetching the filters of trust accounting with data: ${JSON.stringify(payload)}`,
      );

      return await this.adminCombinationalFiltersService.fetchFiltersForAdminTrustAccounting(
        payload,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching the filters of trust accounting with message: ${error}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching the filters of trust accounting with message: ${error}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.RESTRICTED_PORTAL_ADMIN,
    Role.PORTAL_ADMIN,
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
  )
  @Query(() => GetFiltersForNoticeAdminResponse, {
    name: 'fetchFiltersForAdminNotices',
    description: `Fetches combinational filters for notices in admin dashboard.`,
  })
  async fetchFiltersForAdminNotices(
    @Args('payload', {
      description: 'Input parameters for fetching admin notice filters',
    })
    payload: FetchFiltersForNoticeInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received while fetching the filters of notices with data: ${JSON.stringify(payload)}`,
      );

      return await this.adminCombinationalFiltersService.fetchFiltersForAdminNotices(
        payload,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching the filters of notices with message: ${error}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching the filters of notices with message: ${error}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => GetFiltersForComplianceAdminResponse, {
    name: 'fetchFiltersForAdminCompliance',
    description: `Fetches combinational filters for compliance in admin dashboard.`,
  })
  async fetchFiltersForAdminCompliance(
    @Args('payload', {
      description: 'Input parameters for fetching compliance filters',
    })
    payload: FetchFiltersForComplianceInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received while fetching the filters of compliances with data: ${JSON.stringify(payload)}`,
      );

      return await this.adminCombinationalFiltersService.fetchFiltersForAdminCompliance(
        payload,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching the filters of compliances with message: ${error}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching the filters of compliances with message: ${error}`,
      );
    }
  }
}
