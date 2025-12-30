import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
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
  constructor(private readonly compliancesService: CompliancesService) {
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
