import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { CompliancesService } from './compliances.service';
import {
  FetchAllComplianceResultsInDashboardResponse,
  FetchAllCompliancesResponse,
  FetchComplianceResultsOfAProjectResponse,
  FetchComplianceStatusesOfAProjectResponse,
} from './compliances.response';
import {
  FetchAllComplianceResultsInDashboardInput,
  FetchAllCompliancesInput,
  FetchComplianceResultsOfAProjectInput,
  FetchComplianceStatusesOfAProjectInput,
  SilenceComplianceOfAProjectInput,
} from './compliances.input';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

@Resolver()
export class CompliancesResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly compliancesService: CompliancesService,
    private readonly jwtInternalService: JwtInternalService,
  ) {
    this.logger = new PaytradeLogger('COMPLIANCES_RESOLVER');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.RESTRICTED_PORTAL_ADMIN,
    Role.PORTAL_ADMIN,
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
  )
  @Query(() => FetchAllCompliancesResponse, {
    name: 'fetchAllCompliances',
    description:
      'Fetch all compliance records for a company based on the provided payload.',
  })
  async fetchAllCompliances(
    @Args('payload', {
      description:
        'Input payload containing filters and criteria for fetching compliances',
    })
    payload: FetchAllCompliancesInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Handling request for fetching all compliances of a company with data: ${JSON.stringify(payload)}`,
      );

      return this.compliancesService.fetchAllCompliances(payload);
    } catch (error) {
      this.logger.error(
        `Errored while fetching all compliances of a company with data: ${JSON.stringify(payload)}`,
      );
      return framedResponse('ERROR', error.message);
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
  @Mutation(() => FetchAllCompliancesResponse, {
    name: 'sentComplianceMail',
    description: 'Send emails for failed compliance items of a given project.',
  })
  async sentComplianceMail(
    @Args('project_id', {
      description:
        'The unique identifier of the project for which compliance emails should be sent',
    })
    project_id: number,
  ): Promise<any> {
    try {
      await this.compliancesService.sentMailsOnFailedComplianceOfAProject(
        project_id,
      );
      return framedResponse('SUCCESS', 'Mails Sent');
    } catch (error) {
      return framedResponse('ERROR', error.message);
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
  @Mutation(() => FetchAllCompliancesResponse, {
    name: 'silenceComplianceMail',
    description:
      'Silence compliance notifications and rules for a project to stop email alerts temporarily.',
  })
  async silenceComplianceMail(
    @Args('payload', {
      description:
        'Payload containing project ID and rules to silence compliance notifications',
    })
    payload: SilenceComplianceOfAProjectInput,
  ): Promise<any> {
    try {
      await this.compliancesService.silenceComplianceAndRulesOfAProject(
        payload,
      );
      return framedResponse(
        'SUCCESS',
        'Compliance notification has been silenced',
      );
    } catch (error) {
      return framedResponse('ERROR', error.message);
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
  @Query(() => FetchComplianceResultsOfAProjectResponse, {
    name: 'fetchComplianceResultsOfAProject',
    description: 'Fetch detailed compliance results for a specific project.',
  })
  async fetchComplianceResultsOfAProject(
    @Args('payload', {
      description:
        'Input payload containing project ID and optional filters to fetch compliance results',
    })
    payload: FetchComplianceResultsOfAProjectInput,
  ) {
    try {
      this.logger.log(
        `Handling request for fetching compliance results of a project with data: ${JSON.stringify(payload)}`,
      );

      return this.compliancesService.fetchComplianceResultsOfAProject(payload);
    } catch (error) {
      this.logger.error(
        `Errored while fetching compliance results of a project with data: ${JSON.stringify(payload)}`,
      );
      return framedResponse('ERROR', error);
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
  @Query(() => FetchComplianceResultsOfAProjectResponse, {
    name: 'getComplianceResultsOfAProject',
    description:
      'Retrieve compliance data for a project for reporting purposes.',
  })
  async getComplianceResultsOfAProject(
    @Args('payload', {
      description:
        'Input payload containing project ID and optional filters to retrieve compliance data',
    })
    payload: FetchComplianceResultsOfAProjectInput,
  ) {
    try {
      this.logger.log(
        `Handling request for fetching compliance results of a project with data: ${JSON.stringify(payload)}`,
      );

      return this.compliancesService.getComplianceData(payload);
    } catch (error) {
      this.logger.error(
        `Errored while fetching compliance results of a project with data: ${JSON.stringify(payload)}`,
      );
      return framedResponse('ERROR', error);
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
  @Mutation(() => FetchAllCompliancesResponse, {
    name: 'syncComplianceOfProject',
    description:
      'Sync compliance checks for a project with optional PTA verification.',
  })
  async syncComplianceOfProject(
    @Args('projectId', {
      description:
        'The unique identifier of the project whose compliance needs to be synced',
    })
    projectId: number,
    @Args('checkNumber', {
      description: 'The specific compliance check number to sync',
    })
    checkNumber: number,
    @Args('isPTA', {
      description:
        'Flag indicating whether PTA verification should be included in the sync',
    })
    isPTA: boolean,
  ): Promise<any> {
    try {
      await this.compliancesService.syncCompliancesOfProject(
        projectId,
        checkNumber,
        isPTA,
      );
      return framedResponse('SUCCESS', 'Compliance updated');
    } catch (error) {
      return framedResponse('ERROR', error.message);
    }
  }

  // Task #297 — "Refresh now" entry point. Fully rebuilds the persisted
  // compliance cache for one project across both PTA and RTA and across
  // every active check. Wired to the Refresh button on the Compliance
  // overview page so a user who just fixed something doesn't have to
  // wait for the 08:00 UTC cron or the 5s debounced background worker.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.RESTRICTED_PORTAL_ADMIN,
    Role.PORTAL_ADMIN,
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
  )
  @Mutation(() => FetchAllCompliancesResponse, {
    name: 'forceRefreshProjectCompliance',
    description:
      'Rebuild the persisted compliance cache for a project across PTA and RTA. Used by the Compliance page Refresh button.',
  })
  async forceRefreshProjectCompliance(
    @Context() context,
    @Args('projectId', {
      description:
        'The unique identifier of the project whose compliance cache should be rebuilt',
    })
    projectId: number,
  ): Promise<any> {
    try {
      // Authorize: decoded JWT + companyid header establish the
      // caller's effective company context (JwtInternalService already
      // rejects roles that don't belong to that company). We then
      // resolve the project's company_id and ensure it matches —
      // otherwise any authenticated user could refresh (and probe the
      // existence of) any projectId across tenants.
      await this.jwtInternalService.decodeJwtToken(context);
      const headerCompanyId = Number(context?.req?.headers?.companyid);
      if (!headerCompanyId || Number.isNaN(headerCompanyId)) {
        return framedResponse('ERROR', 'Missing company context.');
      }
      const project =
        await this.compliancesService.getProjectCompanyId(Number(projectId));
      if (!project) {
        return framedResponse('ERROR', 'Project not found.');
      }
      if (Number(project.company_id) !== headerCompanyId) {
        return framedResponse(
          'ERROR',
          'Not authorized to refresh compliance for this project.',
        );
      }

      const summary =
        await this.compliancesService.refreshProjectComplianceCache(
          Number(projectId),
        );
      return framedResponse(
        'SUCCESS',
        `Compliance refreshed (PTA: ${summary.pta}, RTA: ${summary.rta}, failed: ${summary.failed})`,
      );
    } catch (error) {
      return framedResponse('ERROR', error.message);
    }
  }

  // Manual per-project compliance pause toggle. When paused, all
  // compliance recompute / system-issue generation, dashboard issue
  // counting and compliance emails are suppressed for the project.
  // Resuming re-runs the full compliance recompute and snapshot rebuild.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.RESTRICTED_PORTAL_ADMIN,
    Role.PORTAL_ADMIN,
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
  )
  @Mutation(() => FetchAllCompliancesResponse, {
    name: 'setProjectCompliancePaused',
    description:
      'Pause or resume compliance monitoring (alerts, system issues and emails) for a project. Resuming re-runs compliance.',
  })
  async setProjectCompliancePaused(
    @Context() context,
    @Args('projectId', {
      description:
        'The unique identifier of the project whose compliance pause state should change',
    })
    projectId: number,
    @Args('paused', {
      description: 'True to pause compliance monitoring, false to resume',
    })
    paused: boolean,
    @Args('reason', {
      nullable: true,
      description: 'Optional reason recorded when pausing',
    })
    reason?: string,
  ): Promise<any> {
    try {
      // Authorize the same way as forceRefreshProjectCompliance: the
      // caller's company (from the companyid header, validated by the
      // JWT guard) must own the project, otherwise any authenticated
      // user could pause compliance on any project across tenants.
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const headerCompanyId = Number(context?.req?.headers?.companyid);
      if (!headerCompanyId || Number.isNaN(headerCompanyId)) {
        return framedResponse('ERROR', 'Missing company context.');
      }
      const project = await this.compliancesService.getProjectCompanyId(
        Number(projectId),
      );
      if (!project) {
        return framedResponse('ERROR', 'Project not found.');
      }
      if (Number(project.company_id) !== headerCompanyId) {
        return framedResponse(
          'ERROR',
          'Not authorized to change compliance pause for this project.',
        );
      }

      const userId = Number((decoded as any)?.userId) || undefined;
      await this.compliancesService.setProjectCompliancePaused(
        Number(projectId),
        Boolean(paused),
        userId,
        reason,
      );
      return framedResponse(
        'SUCCESS',
        paused
          ? 'Compliance monitoring paused for this project.'
          : 'Compliance monitoring resumed for this project.',
      );
    } catch (error) {
      return framedResponse('ERROR', error.message);
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
  @Query(() => FetchAllComplianceResultsInDashboardResponse, {
    name: 'fetchAllComplianceResultsInDashboard',
    description:
      'Fetch all compliance results for dashboard display based on filters.',
  })
  async fetchAllComplianceResultsInDashboard(
    @Args('payload', {
      description:
        'Input payload containing filters and parameters for fetching compliance results in dashboard',
    })
    payload: FetchAllComplianceResultsInDashboardInput,
  ) {
    try {
      this.logger.log(
        `Handling request for fetching all compliance results in dashboard with data: ${JSON.stringify(payload)}`,
      );

      return this.compliancesService.fetchAllComplianceResultsInDashboard(
        payload,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all compliance results in dashboard with data: ${JSON.stringify(payload)}`,
      );
      return framedResponse('ERROR', error);
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
  @Query(() => FetchComplianceStatusesOfAProjectResponse, {
    name: 'fetchComplianceStatusesOfAProject',
    description:
      'Fetch the status of all compliances for a project (e.g., Passed, Failed, Pending).',
  })
  async fetchComplianceStatusesOfAProject(
    @Args('payload', {
      description:
        'Input payload containing project ID and optional filters to fetch compliance statuses',
    })
    payload: FetchComplianceStatusesOfAProjectInput,
  ) {
    try {
      this.logger.log(
        `Handling request for fetching compliance statuses of a project with data: ${JSON.stringify(payload)}`,
      );

      return this.compliancesService.fetchComplianceStatusesOfAProject(payload);
    } catch (error) {
      this.logger.error(
        `Errored while fetching compliance statuses of a project with data: ${JSON.stringify(payload)}`,
      );
      return framedResponse('ERROR', error);
    }
  }
}
