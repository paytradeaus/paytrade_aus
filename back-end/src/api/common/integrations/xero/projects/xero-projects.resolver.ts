import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { StringResponse } from 'src/api/users/signup/response/auth.response';
import {
  GetMappedXeroProjectListsInput,
  GetPaytradeProjectListsInput,
  GetXeroProjectListsInput,
  YetToMapProjectsInput,
} from './dto/xero.input';
import {
  GetPaytradeProjectsListResponse,
  GetPaytradeProjectsResponse,
  GetXeroProjectsListResponse,
  GetXeroProjectsResponse,
} from './response/xero.response';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { XeroProjectsService } from './xero-projects.service';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { AutoMapResponse } from '../xero.response';
import { CreateProjectInput } from 'src/api/users/projects/dto/create-project.input';
import { XeroService } from '../xero.service';
import { XeroResolver } from '../xero.resolver';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Resolver('XeroProjects')
export class XeroProjectsResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly xeroProjectsService: XeroProjectsService,
    private readonly xeroService: XeroService,
    private readonly xeroResolver: XeroResolver,
  ) {
    this.logger = new PaytradeLogger('XERO_PROJECTS_RESOLVER');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => GetXeroProjectsResponse, {
    name: 'createProject',
    description:
      'Creates a new project in Xero for a given company and contact ID.',
  })
  async createProject(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company for which the project is created.',
    })
    company_id: number,
    @Args('contact_id', {
      description: 'ID of the contact associated with the project.',
    })
    contact_id: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for creating project details with arguments project_id: ${company_id}`,
      );
      var decoded = await this.jwtInternalService.decodeJwtToken(context);

      const xeroPayload = {
        company_id: company_id,
        contact_id: contact_id,
      };

      const response: any = await this.xeroProjectsService.createXeroProject(
        decoded,
        xeroPayload,
      );
      this.logger.log(
        `Xero Project details created successfully with data: ${JSON.stringify(response)}`,
      );
      if (response) {
      }
      return framedResponse(
        'SUCCESS',
        'Project created in Xero successfully',
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
  @Mutation(() => GetXeroProjectsResponse, {
    name: 'createProjectInXero',
    description:
      'Creates project tracking options in Xero for an existing project.',
  })
  async createProjectInXero(
    @Context() context,
    @Args('project_id', {
      description: 'ID of the project to create tracking options for.',
    })
    project_id: number,
    @Args('sync_id', {
      nullable: true,
      description: 'Optional sync ID for Xero.',
    })
    sync_id?: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for creating project details with arguments project_id: ${project_id}`,
      );
      const { headers } = context.req;
      var companyId = headers?.companyid;
      var decoded = await this.jwtInternalService.decodeJwtToken(context);

      const xeroPayload = {
        project_id,
        mapped_status: 'System',
        sync_id,
      };

      const response: any =
        await this.xeroProjectsService.createProjectTrackingOptions(
          decoded,
          xeroPayload,
        );
      this.logger.log(
        `Xero Project details created successfully with data: ${JSON.stringify(response)}`,
      );
      if (response) {
        return framedResponse(
          'SUCCESS',
          'Project created in Xero successfully',
          response,
        );
      }
      return framedResponse('ERROR', 'Unable to create project in xero');
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
  @Mutation(() => GetXeroProjectsResponse, {
    name: 'deleteProjectInXero',
    description:
      'Deletes project tracking options in Xero for a specified project.',
  })
  async deleteProjectInXero(
    @Context() context,
    @Args('project_id', { description: 'ID of the project to delete.' })
    project_id: number,
    @Args('sync_id', {
      nullable: true,
      description: 'Optional sync ID for Xero.',
    })
    sync_id?: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for deleting project details with arguments project_id: ${project_id}`,
      );
      const { headers } = context.req;
      var companyId = headers?.companyid;
      var decoded = await this.jwtInternalService.decodeJwtToken(context);

      const xeroPayload = {
        project_id,
        sync_id,
      };

      const response: any =
        await this.xeroProjectsService.deleteProjectTrackingOptions(
          decoded,
          xeroPayload,
        );
      this.logger.log(
        `Xero Project details deleted successfully with data: ${JSON.stringify(response)}`,
      );
      if (response) {
        return framedResponse(
          'SUCCESS',
          'Project deleted in Xero successfully',
          response,
        );
      }
      return framedResponse('ERROR', 'Unable to delete project in xero');
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
  @Mutation(() => GetPaytradeProjectsResponse, {
    name: 'createProjectInPaytrade',
    description:
      'Creates a project in Paytrade with optional payload and sync ID.',
  })
  async createProjectInPaytrade(
    @Context() context,
    @Args('project_id', {
      description: 'ID of the project to create in Paytrade.',
    })
    project_id: string,
    @Args('company_id', {
      description: 'ID of the company associated with the project.',
    })
    company_id: number,
    @Args('sync_id', {
      nullable: true,
      description: 'Optional sync ID for Paytrade.',
    })
    sync_id?: string,
    @Args('payload', {
      nullable: true,
      description: 'Optional payload for creating the project.',
    })
    payload?: CreateProjectInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for creating project details with arguments project_id: ${project_id}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const xeroPayload = {
        company_id,
        project_id,
        sync_id,
        payload,
      };
      const response: any =
        await this.xeroProjectsService.insertProjectDetailsInPaytrade(
          decoded,
          xeroPayload,
        );
      this.logger.log(
        `Paytrade Client supplier details created successfully with data: ${JSON.stringify(response)}`,
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
      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => StringResponse, {
    name: 'getProjectByProjectId',
    description:
      'Fetches project details from Xero by project ID and company ID.',
  })
  async getProjectByProjectId(
    @Context() context,
    @Args('project_id', { description: 'ID of the project to fetch.' })
    project_id: string,
    @Args('company_id', {
      description: 'ID of the company associated with the project.',
    })
    company_id: number,
  ): Promise<any> {
    try {
      const { headers } = context.req;
      var companyId = headers?.companyid;
      var decoded = await this.jwtInternalService.decodeJwtToken(context);

      const response = await this.xeroProjectsService.getProjectByProjectId(
        project_id,
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
  @Mutation(() => AutoMapResponse, {
    name: 'syncAllProjectsByCompanyId',
    description:
      'Synchronizes all projects from Xero for the specified company.',
  })
  async syncAllProjectsByCompanyId(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company to sync projects for.',
    })
    company_id: number,
    @Args('sync_id', { nullable: true, description: 'Optional sync ID.' })
    sync_id?: string,
  ): Promise<any> {
    try {
      const { headers } = context.req;
      var companyId = headers?.companyid;
      var decoded = await this.jwtInternalService.decodeJwtToken(context);
      return await this.xeroProjectsService.syncAllProjectsByCompanyId(
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
  @Query(() => GetXeroProjectsListResponse, {
    name: 'getXeroProjectListsForCompany',
    description:
      'Retrieves a list of projects from Xero for a specific company.',
  })
  async getXeroProjectListsForCompany(
    @Args('payload', {
      description:
        'Payload containing filters and pagination to fetch project lists.',
    })
    payload: GetXeroProjectListsInput,
  ) {
    try {
      this.logger.log(
        `Request received for getting project lists: ${JSON.stringify(payload)}`,
      );
      const projectLists =
        await this.xeroProjectsService.getXeroProjectListsForCompany(payload);
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(projectLists)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Fetched projects successfully`,
        projectLists,
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
  @Query(() => GetPaytradeProjectsListResponse, {
    name: 'getPaytradeProjectListsForCompany',
    description:
      'Retrieves a list of projects from Paytrade for a specific company.',
  })
  async getPaytradeProjectListsForCompany(
    @Args('payload', {
      description:
        'Payload containing filters and pagination to fetch project lists.',
    })
    payload: GetPaytradeProjectListsInput,
  ) {
    try {
      this.logger.log(
        `Request received for getting project lists: ${JSON.stringify(payload)}`,
      );
      const projectLists =
        await this.xeroProjectsService.getPaytradeProjectListsForCompany(
          payload,
        );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(projectLists)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Fetched projects successfully`,
        projectLists,
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
  @Query(() => GetXeroProjectsListResponse, {
    name: 'getMappedProjectLists',
    description: 'Fetches a list of mapped projects for the specified company.',
  })
  async getMappedProjectLists(
    @Args('payload', {
      description:
        'Payload containing filters and pagination to fetch project lists.',
    })
    payload: GetMappedXeroProjectListsInput,
  ) {
    try {
      this.logger.log(
        `Request received for getting project lists: ${JSON.stringify(payload)}`,
      );
      const projectLists =
        await this.xeroProjectsService.getMappedProjectLists(payload);
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(projectLists)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Fetched mapped projects successfully`,
        projectLists,
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
    name: 'manualMappingProject',
    description: 'Manually maps unmapped projects for the specified company.',
  })
  async manualMappingProject(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing projects and mapping details for manual mapping.',
    })
    payload: YetToMapProjectsInput,
  ) {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const { headers } = context.req;
      const companyId = headers?.companyid;
      const response = await this.xeroProjectsService.manualMappingProject(
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
    name: 'autoMappingProject',
    description: 'Automatically maps projects for the specified company.',
  })
  async autoMappingProject(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company whose projects will be auto-mapped.',
    })
    company_id: number,
  ) {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      return await this.xeroProjectsService.autoMappingProject(
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
    name: 'unMappingProject',
    description: 'Removes mapping for a specific project.',
  })
  async unMappingProject(
    @Context() context,
    @Args('project_id', { description: 'ID of the project to unmap.' })
    project_id: string,
  ) {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const { headers } = context.req;
      const companyId = headers?.companyid;
      const response = await this.xeroProjectsService.unMappingProject(
        project_id,
        companyId,
        decoded,
      );
      return framedResponse('SUCCESS', response);
    } catch (error) {
      return framedResponse('ERROR', error.message ? error.message : error);
    }
  }
}
