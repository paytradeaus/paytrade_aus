import { Resolver, Query, Mutation, Args, Int, Context } from '@nestjs/graphql';
import { VariationsService } from './variations.service';
import { CreateVariationInput } from './dto/create-variation.input';
import { UpdateVariationInput } from './dto/update-variation.input';
import { UseGuards } from '@nestjs/common';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { handleError } from 'src/api/common/error-handler';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import {
  GetVariationListForProjectsInput,
  GetVariationListsInput,
} from './dto/get-variation-lists.input';
import { VariationDetailsResponse } from './response/variation.response';
import {
  GetVariationResponse,
  ViewVariationListResponse,
  ViewVariationResponse,
} from './response/view-variation-list.response';
import { readFileSync } from 'fs';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { CreateActivityLogInput } from 'src/api/common/activity-log/dto/create-activity-log.input';
import { startCasePreserveUnicode } from 'src/libs/@title-case-convertor/title-case-convertor';
import { linkExtensions } from 'src/api/common/activity-log/link-extensions';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { formatCurrency } from 'src/libs/@currency-formattor/currency-formattor';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');
var errorMessage = '';

@Resolver()
export class VariationsResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly variationsService: VariationsService,
    private readonly activityLogService: ActivityLogService,
    @InjectRepository(ProjectDetails)
    private projectDetailsRepo: Repository<ProjectDetails>,
    @InjectRepository(CompanyDetails)
    private companyDetailsRepo: Repository<CompanyDetails>,
  ) {
    this.logger = new PaytradeLogger('VARIATIONS_RESOLVER');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BASIC_USER, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => VariationDetailsResponse, {
    name: 'insertVariationDetails',
    description: `
    Creates a new variation for a specified project.
    Logs the activity including admin/user context, project, and variation details.
    `,
  })
  async insertVariationDetails(
    @Context() context,
    @Args('createVariationInput', {
      description:
        'Input payload containing company ID, project ID, variation name, amount, and other variation details',
    })
    createVariationInput: CreateVariationInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: ${JSON.stringify(createVariationInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const variationDetails =
        await this.variationsService.insertVariationDetails(
          decoded,
          createVariationInput,
        );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(variationDetails)}`,
      );
      if (variationDetails) {
        variationDetails.variation_id =
          100000 + Number(variationDetails.variation_id);
        const companyDetails =
          await this.variationsService.getCompanyDetailsById(
            createVariationInput.company_id,
          );

        //Generating link to view created variation.
        const variationLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[7]}` +
          variationDetails.id +
          `?from=log`;
        console.log('variationLink', variationLink);

        const projectDetails = await this.projectDetailsRepo.findOne({
          where: { project_id: variationDetails.project_id },
        });
        console.log('projectDetails', projectDetails);

        //Generating project link.
        const projectLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[4]}` +
          `${projectDetails.id}` +
          `?from=log`;
        console.log('projectLink', projectLink);

        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: 63,
          admin_id:
            decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
              ? decoded?.admin_id
              : null,
          to_user:
            decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
              ? decoded?.userId
              : null,
          from_user:
            decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
              ? null
              : decoded?.userId,
          company_id: createVariationInput.company_id,
          dynamic_values: {
            variationName: await startCasePreserveUnicode(
              createVariationInput.variation_name,
            ),
            variationLink,
            variationAmount: formatCurrency(variationDetails.variation_amount),
            projectName: projectDetails.project_name,
            projectLink,
          },
          is_admin: false,
          created_by: decoded?.userId,
        };
        await this.activityLogService.insertActivityLog(createActivityLogInput);
        return framedResponse(
          'SUCCESS',
          `This variation has been added.`,
          variationDetails,
        );
      }
      throw new Error(`Unable to add variation details`);
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
  @Query(() => ViewVariationListResponse, {
    name: 'getVariationListsForCompany',
    description: `
    Fetches all variations associated with a given company.
    `,
  })
  async getVariationListsForCompany(
    @Context() context,
    @Args('getVariationListsInput', {
      description:
        'Input payload containing company ID and optional filters for fetching variations',
    })
    getVariationListsInput: GetVariationListsInput,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: ${JSON.stringify(getVariationListsInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const timezone = decoded?.token || 'UTC';
      const variationLists =
        await this.variationsService.getVariationListsForCompany(
          getVariationListsInput,
          timezone,
        );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(variationLists)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        variationLists,
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
  @Query(() => ViewVariationResponse, {
    name: 'viewVariationDetailsById',
    description: `
    Fetches detailed information for a variation by its ID.
    `,
  })
  async viewVariationDetailsById(
    @Context() context,
    @Args('id', {
      description: 'Unique identifier of the variation to retrieve',
    })
    id: string,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: id:: ${id}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response =
        await this.variationsService.viewVariationDetailsById(id);
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(response)}`,
      );
      if (response && response !== null && response.file_path) {
        const image = readFileSync(response.file_path, {
          encoding: 'base64',
        });
        response['file'] = `data:${response.file_type};base64,${image}`;
        response.file_path = response.file_path
          ? process.env.UPLOAD_BASE_URL + response.file_path.replace(/\\/g, '/')
          : response.file_path;
      }
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
  @Mutation(() => ViewVariationResponse, {
    name: 'editVariationDetailsById',
    description: `
    Edits details of an existing variation.
    Updates the variation status, logs activity, and generates audit links for variation and project.
    Supports multiple status updates: Draft, In Review, Agreed, Refused, Deleted.
    `,
  })
  async editVariationDetailsById(
    @Context() context,
    @Args('updateVariationInput', {
      description:
        'Input payload containing variation ID, updated details, and new status for editing a variation',
    })
    updateVariationInput: UpdateVariationInput,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: ${JSON.stringify(updateVariationInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const variationDetails =
        await this.variationsService.getVariationsDetailsById(
          updateVariationInput.id,
        );
      this.logger.log(
        `Response recieved while fetching variation: ${JSON.stringify(variationDetails)}`,
      );
      if (variationDetails) {
        const editVariationDetailsRes =
          await this.variationsService.editVariationDetailsById(
            updateVariationInput,
            decoded?.userId,
          );
        this.logger.log(
          `Response recieved while leaving the client: ${JSON.stringify(editVariationDetailsRes)}`,
        );
        if (editVariationDetailsRes) {
          //Generating link to view edited variation.
          const variationLink =
            `${process.env.LOG_BASE_URL}` +
            `${linkExtensions[7]}` +
            variationDetails.id +
            `?from=log`;
          console.log('variationLink', variationLink);

          const projectDetails = await this.projectDetailsRepo.findOne({
            where: { project_id: variationDetails.project_id },
            relations: ['companyDetails'],
          });
          console.log('projectDetails', projectDetails);

          //Generating project link.
          const projectLink =
            `${process.env.LOG_BASE_URL}` +
            `${linkExtensions[4]}` +
            `${projectDetails.id}` +
            `?from=log`;
          console.log('projectLink', projectLink);

          const createActivityLogInput: CreateActivityLogInput = {
            event_template_id:
              updateVariationInput.variation_status !== 'Deleted' ? 64 : 65,
            admin_id:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? decoded?.admin_id
                : null,
            to_user:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? decoded?.userId
                : null,
            from_user:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? null
                : decoded?.userId,
            company_id: updateVariationInput.company_id,
            dynamic_values: {
              variationName: await startCasePreserveUnicode(
                updateVariationInput.variation_name,
              ),
              variationLink,
              variationAmount: formatCurrency(
                variationDetails.variation_amount,
              ),
              projectName: projectDetails.project_name,
              projectLink,
            },
            is_admin: false,
            created_by: decoded?.userId,
          };
          await this.activityLogService.insertActivityLog(
            createActivityLogInput,
          );
          var successMessage = '';
          switch (updateVariationInput.variation_status) {
            case 'Draft':
              successMessage = 'This variation has been updated.';
              break;
            case 'In Review':
              successMessage = 'This variation is in review.';
              break;
            case 'Agreed':
              successMessage = 'This variation has been agreed.';
              break;
            case 'Refused':
              successMessage = 'This variation has been refused.';
              break;
            case 'Deleted':
              successMessage = 'This variation has been deleted.';
              break;
          }
          return framedResponse(
            'SUCCESS',
            successMessage,
            editVariationDetailsRes,
          );
        }
        throw new Error(`Unable to edit the variation, please try again`);
      }
      throw new Error(`Unable to edit the variation, please try again`);
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
  @Mutation(() => ViewVariationResponse, {
    name: 'updateVariationStatusById',
    description: `
    Updates the status of a variation by ID.
    Logs activity for status changes including links to variation and associated project.
    Supports status values: In Review, Agreed, Refused, Deleted.
    `,
  })
  async updateVariationStatusById(
    @Context() context,
    @Args('id', { description: 'Unique identifier of the variation to update' })
    id: string,
    @Args('status', {
      description:
        'New status of the variation (In Review, Agreed, Refused, Deleted)',
    })
    status: string,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: id:: ${id}, status:: ${status}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const variationDetails =
        await this.variationsService.getVariationsDetailsById(id);
      this.logger.log(
        `Response recieved while fetching variation: ${JSON.stringify(variationDetails)}`,
      );
      if (variationDetails) {
        const updateVariationStatusRes =
          await this.variationsService.updateVariationStatusById(
            variationDetails,
            decoded?.userId,
            status,
          );
        this.logger.log(
          `Response recieved while leaving the client: ${JSON.stringify(updateVariationStatusRes)}`,
        );
        if (updateVariationStatusRes) {
          updateVariationStatusRes.created_on =
            updateVariationStatusRes.created_on
              ? new Date(updateVariationStatusRes.created_on)
              : new Date(0);

          //Generating link to view updated variation.
          const variationLink =
            `${process.env.LOG_BASE_URL}` +
            `${linkExtensions[7]}` +
            variationDetails.id +
            `?from=log`;
          console.log('variationLink', variationLink);

          const projectDetails = await this.projectDetailsRepo.findOne({
            where: { project_id: variationDetails.project_id },
          });
          console.log('projectDetails', projectDetails);

          //Generating project link.
          const projectLink =
            `${process.env.LOG_BASE_URL}` +
            `${linkExtensions[4]}` +
            `${projectDetails.id}` +
            `?from=log`;
          console.log('projectLink', projectLink);

          const createActivityLogInput: CreateActivityLogInput = {
            event_template_id: 65,
            admin_id:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? decoded?.admin_id
                : null,
            to_user:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? decoded?.userId
                : null,
            from_user:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? null
                : decoded?.userId,
            company_id: variationDetails.company_id,
            dynamic_values: {
              variationName: await startCasePreserveUnicode(
                variationDetails.variation_name,
              ),
              variationLink,
              status,
              variationAmount: formatCurrency(
                variationDetails.variation_amount,
              ),
              projectName: projectDetails.project_name,
              projectLink,
            },
            is_admin: false,
            created_by: decoded?.userId,
          };
          await this.activityLogService.insertActivityLog(
            createActivityLogInput,
          );
          var successMessage = '';
          switch (status) {
            case 'In Review':
              successMessage = 'This variation is in review.';
              break;
            case 'Agreed':
              successMessage = 'This variation has been agreed.';
              break;
            case 'Refused':
              successMessage = 'This variation has been refused.';
              break;
            case 'Deleted':
              successMessage = 'This variation has been deleted.';
              break;
          }
          return framedResponse(
            'SUCCESS',
            successMessage,
            updateVariationStatusRes,
          );
        }
        throw new Error(`Unable to update the variation, please try again`);
      }
      throw new Error(`Unable to update the variation, please try again`);
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
  @Query(() => GetVariationResponse, {
    name: 'getVariationDetailsByVariationId',
    description: `
    Fetches a variation by its internal variation ID.
    Returns full variation details for client consumption.
    `,
  })
  async getVariationDetailsByVariationId(
    @Context() context,
    @Args('variation_id', {
      description: 'Internal ID of the variation to fetch',
    })
    variation_id: number,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: id:: ${variation_id}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response =
        await this.variationsService.getVariationDetailsById(variation_id);
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
  @Query(() => ViewVariationListResponse, {
    name: 'getVariationDetailsByProjectId',
    description: `
    Fetches all variations for a given project.
    `,
  })
  async getVariationDetailsByProjectId(
    @Context() context,
    @Args('getVariationListForProjectsInput', {
      description:
        'Input payload containing project ID and optional filters for fetching variations',
    })
    getVariationListForProjectsInput: GetVariationListForProjectsInput,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with input:: ${JSON.stringify(getVariationListForProjectsInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const timezone = decoded?.token || 'UTC';
      const response =
        await this.variationsService.getVariationDetailsByProjectId(
          getVariationListForProjectsInput,
          timezone,
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
}
