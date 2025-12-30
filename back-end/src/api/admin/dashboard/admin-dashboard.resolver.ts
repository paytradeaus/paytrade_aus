import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { Context, Query, Resolver } from '@nestjs/graphql';
import {
  FetchAllBankAccountsWithTrustAccountingIssuesResponse,
  FetchAllCompaniesWithFailedSubscriptionStatusResponse,
  FetchAllNewCompaniesResponse,
  FetchAllNewUsersResponse,
  FetchhAllProjectsWithComplianceIssuesResponse,
} from './admin-dashboard.response';
import { AdminDashboardService } from './admin-dashboard.service';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';

@Resolver()
export class AdminDashboardResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private adminDashboardService: AdminDashboardService,
  ) {
    this.logger = new PaytradeLogger('ADMIN_DASHBOARD_RESOLVER');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.PORTAL_ADMIN,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Query(() => FetchAllNewUsersResponse, {
    name: 'fetchAllNewUsers',
    description: 'Fetches a list of all newly registered users in the system.',
  })
  async fetchAllNewUsers() {
    try {
      this.logger.log(`Request received for fetching all new users.`);

      return this.adminDashboardService.fetchAllNewUsers();
    } catch (error) {
      this.logger.error(
        `Errored while fetching all new users with message: ${error.message}`,
      );
      return framedResponse('ERROR', error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Query(() => FetchAllNewCompaniesResponse, {
    name: 'fetchAllNewCompanies',
    description:
      'Fetches a list of all newly registered companies in the system.',
  })
  async fetchAllNewCompanies() {
    try {
      this.logger.log(`Request received for fetching all new companies.`);

      return this.adminDashboardService.fetchAllNewCompanies();
    } catch (error) {
      this.logger.error(
        `Errored while fetching all new companies with message: ${error.message}`,
      );
      return framedResponse('ERROR', error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Query(() => FetchAllCompaniesWithFailedSubscriptionStatusResponse, {
    name: 'fetchAllCompaniesWithFailedSubscriptionStatus',
    description: 'Fetches all companies whose subscription status has failed.',
  })
  async fetchAllCompaniesWithFailedSubscriptionStatus() {
    try {
      this.logger.log(
        `Request received for fetching all companies with failed subscription status.`,
      );

      return this.adminDashboardService.fetchAllCompaniesWithFailedSubscriptionStatus();
    } catch (error) {
      this.logger.error(
        `Errored while fetching all companies with failed subscription status with message: ${error.message}`,
      );
      return framedResponse('ERROR', error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Query(() => FetchhAllProjectsWithComplianceIssuesResponse, {
    name: 'fetchAllProjectsWithComplianceIssues',
    description: 'Fetches all projects that currently have compliance issues.',
  })
  async fetchAllProjectsWithComplianceIssues() {
    try {
      this.logger.log(
        `Request received for fetching all projects with compliance issues.`,
      );

      return this.adminDashboardService.fetchAllProjectsWithComplianceIssues();
    } catch (error) {
      this.logger.error(
        `Errored while fetching all projects with compliance issues with message: ${error.message}`,
      );
      return framedResponse('ERROR', error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Query(() => FetchAllBankAccountsWithTrustAccountingIssuesResponse, {
    name: 'fetchAllBankAccountsWithTrustAccountingIssues',
    description:
      'Fetches all bank accounts that currently have trust accounting issues.',
  })
  async fetchAllBankAccountsWithTrustAccountingIssues(@Context() context) {
    try {
      this.logger.log(
        `Request received for fetching all bank accounts with trust accounting issues.`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const timezone = decoded?.token || 'UTC';

      return await this.adminDashboardService.fetchAllBankAccountsWithTrustAccountingIssues(
        timezone,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all bank accounts with trust accounting issues with message: ${error.message}`,
      );
      return framedResponse('ERROR', error);
    }
  }
}
