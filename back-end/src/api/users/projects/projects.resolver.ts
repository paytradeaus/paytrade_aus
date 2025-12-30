import { Resolver, Query, Mutation, Args, Int, Context } from '@nestjs/graphql';
import { ProjectsService } from './projects.service';
import {
  CheckExistenceForProjectResponse,
  ProjectDetailsResponse,
} from './response/project-details.response';
import { CreateProjectInput } from './dto/create-project.input';
import { UpdateProjectInput } from './dto/update-project.input';
import { UseGuards } from '@nestjs/common';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { ViewProjectListResponse } from './response/view-project-list.response';
import { ViewProjectResponse } from './response/view-project.response';
import {
  GetProjectContractListsInput,
  GetProjectListsInput,
} from './dto/get-project-lists.input';
import { handleError } from 'src/api/common/error-handler';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import {
  GetProjectsContractsListResponse,
  GetProjectsListResponse,
} from './response/get-projects-list.response';
import { XeroService } from 'src/api/common/integrations/xero/xero.service';
import { XeroProjectsService } from 'src/api/common/integrations/xero/projects/xero-projects.service';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');
var errorMessage = '';

@Resolver()
export class ProjectsResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly projectsService: ProjectsService,
    private readonly xeroService: XeroService,
    private readonly xeroProjectsService: XeroProjectsService,
  ) {
    this.logger = new PaytradeLogger('PROJECTS');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BASIC_USER, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => ProjectDetailsResponse, {
    name: 'insertProjectDetails',
    description: `
    Creates a new project for a specified company.
    Checks user authorization and logs activity.
    If Xero integration is active, also creates tracking options in Xero.
    Returns the newly created project details.
    `,
  })
  async insertProjectDetails(
    @Context() context,
    @Args('createProjectInput', {
      description: `Payload to create a new project for a specified company, including project details.`,
    })
    createProjectInput: CreateProjectInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for inserting project details with payload: ${JSON.stringify(createProjectInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const isAuthorized = await this.projectsService.checkCompanyAuthorized(
        decoded,
        createProjectInput?.company_id,
      );
      if (!isAuthorized) throw `Unauthorized to perform this action`;

      const response: any = await this.projectsService.insertProjectDetails(
        decoded,
        createProjectInput,
      );

      if (response?.warning) {
        return framedResponse('WARNING', response.warningMessage);
      }

      if (response) {
        this.logger.log(
          `Response received after inserting project details with data: ${JSON.stringify(response?.project_name)}`,
        );
        const xeroDetails = await this.xeroService.getIntegrationDetails(
          createProjectInput.company_id,
        );
        if (
          xeroDetails &&
          xeroDetails.integration_id &&
          xeroDetails?.integrationDetails &&
          xeroDetails?.integrationDetails?.integration_status ===
            'Connected - active'
        ) {
          const xeroPayload = {
            project_id: response.project_id,
            mapped_status: 'System',
          };

          const xeroResponse: any =
            await this.xeroProjectsService.createProjectTrackingOptions(
              decoded,
              xeroPayload,
            );
          this.logger.log(
            `Xero Project details inserted successfully with data: ${JSON.stringify(xeroResponse)}`,
          );
        }

        return framedResponse(
          'SUCCESS',
          `This project has been added.`,
          response,
        );
      }
      throw new Error(`Unable to add Project details`);
    } catch (error) {
      errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Errored inside the client with message: ${errorMessage}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
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
  @Query(() => ViewProjectListResponse, {
    name: 'getProjectListsForCompany',
    description: `
    Fetches all projects for a specified company.
    Checks user authorization before returning the project list.
    Returns a list of project summaries with relevant details.
    `,
  })
  async getProjectListsForCompany(
    @Context() context,
    @Args('getProjectListsInput', {
      description: `Payload to fetch all projects for a company. Includes authorization checks.`,
    })
    getProjectListsInput: GetProjectListsInput,
  ) {
    try {
      this.logger.log(
        `Request received for getting project lists: ${JSON.stringify(getProjectListsInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const isAuthorized = await this.projectsService.checkCompanyAuthorized(
        decoded,
        getProjectListsInput?.company_id,
      );
      if (!isAuthorized) throw `Unauthorized to perform this action`;
      const projectLists =
        await this.projectsService.getProjectListsForCompany(
          getProjectListsInput,
        );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(projectLists)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        projectLists,
      );
    } catch (error) {
      errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Errored inside the client with message: ${errorMessage}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => ViewProjectResponse, {
    name: 'viewProjectDetails',
    description: `
    Fetches detailed information for a project by its ID.
    Includes authorization check to ensure user has access to the company's projects.
    Returns full project details.
    `,
  })
  async viewProjectDetails(
    @Context() context,
    @Args('id', { description: 'Unique ID of the project to fetch' })
    id: string,
  ) {
    try {
      this.logger.log(
        `Handling request for viewing project details with id: ${id}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response = await this.projectsService.viewProjectDetailsById(id);
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(response)}`,
      );
      const isAuthorized = await this.projectsService.checkCompanyAuthorized(
        decoded,
        response?.company_id,
      );
      if (!isAuthorized) throw `Unauthorized to perform this action`;
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        response,
      );
    } catch (error) {
      errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Errored inside the client with message: ${errorMessage}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => ViewProjectResponse, {
    name: 'editProjectDetailsById',
    description: `
    Edits an existing project by ID.
    Supports updating project status (Draft, In Progress, Completed, Deleted/Archived).
    Performs authorization checks and logs activity.
    Returns updated project details.
    `,
  })
  async editProjectDetailsById(
    @Context() context,
    @Args('updateProjectInput', {
      description: `Payload to edit a project by ID, including status updates.`,
    })
    updateProjectInput: UpdateProjectInput,
  ) {
    try {
      this.logger.log(
        `Request received for editing project details with input: ${JSON.stringify(updateProjectInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const projectDetails = await this.projectsService.getProjectDetailsById(
        updateProjectInput.id,
      );
      const isAuthorized = await this.projectsService.checkCompanyAuthorized(
        decoded,
        projectDetails?.company_id,
      );
      if (!isAuthorized) throw `Unauthorized to perform this action`;
      this.logger.log(
        `Response received with project details: ${JSON.stringify(projectDetails)}`,
      );
      if (
        projectDetails &&
        ['Draft', 'In Progress'].includes(projectDetails.project_status)
      ) {
        const response: any = await this.projectsService.editProjectDetailsById(
          updateProjectInput,
          decoded,
        );

        if (response?.warning) {
          return framedResponse('WARNING', response.warningMessage);
        }

        if (response) {
          this.logger.log(
            `Response received after editing the project details with data: ${JSON.stringify(response)}`,
          );

          let successMessage = '';
          if (
            ['Draft', 'In Progress'].includes(updateProjectInput.project_status)
          ) {
            successMessage = 'This project has been updated.';
          } else if (updateProjectInput.project_status === 'Completed') {
            successMessage = 'This project has been completed.';
          } else if (updateProjectInput.project_status === 'Deleted') {
            successMessage = 'This project has been archived.';
          }

          return framedResponse('SUCCESS', successMessage, response);
        }
        throw new Error(`Unable to edit the project, please try again`);
      }
      throw new Error(`Unable to edit the project`);
    } catch (error) {
      errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Errored inside the client with message: ${errorMessage}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors
        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => ViewProjectResponse, {
    name: 'updateProjectStatusById',
    description: `
    Updates the status of a project by ID (e.g., Completed, Deleted/Archived).
    Checks authorization and handles Xero integration cleanup if the project is deleted.
    Logs activity and returns updated project details.
    `,
  })
  async updateProjectStatusById(
    @Context() context,
    @Args('id', { description: 'Unique ID of the project to update' })
    id: string,
    @Args('status', {
      description:
        'New status to set for the project (Completed, Deleted, Archived)',
    })
    status: string,
  ) {
    try {
      this.logger.log(
        `Request received for updating the project status with id: ${id} and status: ${status}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const projectDetails =
        await this.projectsService.getProjectDetailsById(id);
      const isAuthorized = await this.projectsService.checkCompanyAuthorized(
        decoded,
        projectDetails?.company_id,
      );
      if (!isAuthorized) throw `Unauthorized to perform this action`;
      this.logger.log(
        `Response received with project details: ${JSON.stringify(projectDetails)}`,
      );
      if (projectDetails) {
        const response: any =
          await this.projectsService.updateProjectStatusById(
            id,
            decoded,
            status,
          );
        if (response?.warning) {
          return framedResponse('WARNING', response.warningMessage);
        }

        if (response) {
          this.logger.log(
            `Response received after updating the project status with data: ${JSON.stringify(response)}`,
          );

          if (status === 'Deleted') {
            const xeroDetails = await this.xeroService.getIntegrationDetails(
              projectDetails.company_id,
            );
            if (
              xeroDetails &&
              xeroDetails.integration_id &&
              xeroDetails?.integrationDetails &&
              xeroDetails?.integrationDetails?.integration_status ===
                'Connected - active'
            ) {
              const isProjectExists =
                await this.xeroProjectsService.getProjectDetails(
                  projectDetails.project_id,
                  xeroDetails.integration_id,
                );
              if (isProjectExists) {
                const xeroPayload = {
                  project_id: projectDetails.project_id,
                };
                const xeroResponse: any =
                  await this.xeroProjectsService.deleteProjectTrackingOptions(
                    decoded,
                    xeroPayload,
                  );
                this.logger.log(
                  `Xero project details deleted successfully with data: ${JSON.stringify(xeroResponse)}`,
                );
              }
            }
          }

          let successMessage = '';
          if (status === 'Completed') {
            successMessage = 'This project has been completed.';
          } else if (status === 'Deleted') {
            successMessage = 'This project has been archived.';
          }
          return framedResponse('SUCCESS', successMessage, response);
        }
        throw new Error(`Unable to update the project, please try again`);
      }
      throw new Error(`Unable to update the project, please try again`);
    } catch (error) {
      errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Errored inside the client with message: ${errorMessage}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors
        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => GetProjectsListResponse, {
    name: 'getProjectsLists',
    description: `
    Fetches a list of projects for a given company.
    Supports optional filters: archived projects and bank account association.
    Checks authorization before returning results.
    `,
  })
  async getProjectsLists(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company whose projects are to be fetched',
    })
    company_id: number,
    @Args('is_archived', {
      description: 'Optional flag to filter archived projects',
      nullable: true,
    })
    is_archived?: boolean,
    @Args('bank_account_id', {
      description:
        'Optional bank account ID to filter projects by associated bank account',
      nullable: true,
    })
    bank_account_id?: number,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: company_id: ${company_id}, is_archived: ${is_archived}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const isAuthorized = await this.projectsService.checkCompanyAuthorized(
        decoded,
        company_id,
      );
      if (!isAuthorized) throw `Unauthorized to perform this action`;
      const response = await this.projectsService.getProjectsLists(
        company_id,
        is_archived,
        bank_account_id,
      );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(response)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        response,
      );
    } catch (error) {
      errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Errored inside the client with message: ${errorMessage}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => GetProjectsContractsListResponse, {
    name: 'getProjectsContractsLists',
    description: `
    Fetches the list of contracts associated with a company's projects.
    Performs authorization check for the company before returning results.
    `,
  })
  async getProjectsContractsLists(
    @Context() context,
    @Args('getProjectContractListsInput', {
      description: `Payload to fetch contracts linked to a company's projects.`,
    })
    getProjectContractListsInput: GetProjectContractListsInput,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: company_id: ${JSON.stringify(getProjectContractListsInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const isAuthorized = await this.projectsService.checkCompanyAuthorized(
        decoded,
        getProjectContractListsInput?.company_id,
      );
      if (!isAuthorized) throw `Unauthorized to perform this action`;
      const response = await this.projectsService.getProjectsContractsLists(
        getProjectContractListsInput,
      );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(response)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        response,
      );
    } catch (error) {
      errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Errored inside the client with message: ${errorMessage}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => CheckExistenceForProjectResponse, {
    name: 'checkExistenceForProject',
    description: `
    Checks if a project exists for a given company.
    Optionally verifies existence by project name.
    Returns project details if found, otherwise returns empty response.
    `,
  })
  async checkExistenceForProject(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company to check project existence for',
    })
    company_id: number,
    @Args('project_name', {
      description: 'Optional name of the project to check existence for',
      nullable: true,
    })
    project_name?: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: company_id:: ${company_id} and project_name:: ${project_name}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const isAuthorized = await this.projectsService.checkCompanyAuthorized(
        decoded,
        company_id,
      );
      if (!isAuthorized) throw `Unauthorized to perform this action`;
      const projectDetails =
        await this.projectsService.checkExistenceForProject(
          company_id,
          project_name,
        );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(projectDetails)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        projectDetails,
      );
    } catch (error) {
      errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Errored inside the client with message: ${errorMessage}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }
}
