import { Args, Context, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PtGroupsService } from './pt-groups.service';
import { HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { Roles } from '../../../api/auth/role-guard/roles.decorator';
import { Role } from '../../../api/auth/role-guard/role.enum';
import { JwtAuthGuard } from '../../../api/auth/jwt-guard/jwt-auth.guard';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { PTGroupResponse } from './response/pt-group.response';
import { AddGroupInput } from './dto/add.group.dto';
import { UpdateGroupInput } from './dto/update.group.dto';
import { GroupStatus } from '../../../entities/admin-group-details.entity';
import { PTGroupListResponse } from './response/pt-group-list.response';
import {
  PTGroupMenu,
  PTGroupMenuResponse,
} from './response/pt-group-menu.response';
import { Public } from 'src/api/auth/jwt-guard/public.decorator';
import { MenuListResponse } from './response/pt-menu-list.response';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { CreateActivityLogInput } from 'src/api/common/activity-log/dto/create-activity-log.input';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { handleError } from 'src/api/common/error-handler';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { SideMenuResponse } from './response/pt-group-side-menus.response';
import { linkExtensions } from 'src/api/common/activity-log/link-extensions';
import { SortingOrder } from '../pt-admin/dto/add-admin.dto';

@Resolver()
export class PtGroupsResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly ptGroupsService: PtGroupsService,
    private readonly activityLogService: ActivityLogService,
  ) {
    this.logger = new PaytradeLogger('ADMIN_GROUP_RESOLVER');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.RESTRICTED_PORTAL_ADMIN)
  @Query(() => PTGroupResponse, {
    name: 'checkGroupNameExistence',
    description: 'Checks if a group name already exists.',
  })
  async checkGroupNameExistence(
    @Args('group_name', {
      description: 'Name of the admin group to check for existence.',
    })
    group_name: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: group_name:: ${group_name}`,
      );
      const groupDetails =
        await this.ptGroupsService.getGroupByName(group_name);
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(groupDetails)}`,
      );
      if (groupDetails) {
        return framedResponse(
          'SUCCESS',
          `Group name already exists.`,
          groupDetails,
        );
      } else {
        return framedResponse(
          'SUCCESS',
          `Group name does not exist.`,
          groupDetails,
        );
      }
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.RESTRICTED_PORTAL_ADMIN)
  @Query(() => MenuListResponse, {
    name: 'adminfetchListOfAllMenus',
    description: 'Fetches all admin menus.',
  })
  async adminfetchListOfAllMenus() {
    try {
      const response = this.ptGroupsService.adminfetchListOfAllMenus();
      if (response) {
        return framedResponse(
          'SUCCESS',
          `Response successfully sent back to the client`,
          response,
        );
      } else {
        return framedResponse(
          'SUCCESS',
          `Admim privilege menu does not exist. Please contact Paytrade administrator.`,
          response,
        );
      }
    } catch (error) {
      return framedResponse(
        'ERROR',
        `Errored while fetching details of MaterType ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.RESTRICTED_PORTAL_ADMIN)
  @Mutation(() => PTGroupResponse, {
    name: 'insertAdminGroupDetails',
    description: 'Creates a new admin group.',
  })
  async insertAdminGroupDetails(
    @Context() context,
    @Args('addPTGroupInput', {
      description:
        'Input payload containing details required to create a new admin group, including name, description, status, and menu permissions.',
    })
    addPTGroupInput: AddGroupInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for creating new admin group with payload: ${JSON.stringify(addPTGroupInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const ptGroup =
        await this.ptGroupsService.insertAdminGroupDetails(addPTGroupInput);

      //Generating link to view inserted admin group details.
      const groupLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[17]}` +
        `/edit/${ptGroup.id}` +
        `?from=log`;

      const createActivityLogInput: CreateActivityLogInput = {
        event_template_id: 140,
        admin_id: decoded?.userId,
        dynamic_values: {
          groupName: ptGroup.group_name,
          groupLink,
        },
        is_admin: true,
        created_by: decoded?.userId,
      };
      await this.activityLogService.insertActivityLog(createActivityLogInput);
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        ptGroup,
      );
    } catch (error) {
      this.logger.error(
        `Errored while inserting project details with message: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.RESTRICTED_PORTAL_ADMIN)
  @Mutation(() => PTGroupResponse, {
    name: 'updateGroupDetails',
    description: 'Updates an existing admin group.',
  })
  async updateGroupDetails(
    @Context() context,
    @Args('updateAdminInput', {
      description:
        'Input payload containing updated admin group details such as name, description, status, and menu permission changes.',
    })
    updateGroupInput: UpdateGroupInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for updating an admin group with payload: ${JSON.stringify(updateGroupInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      if (updateGroupInput.group_status === 'Deleted') {
        const checkAssociatedAdmins =
          await this.ptGroupsService.getAdminDetails(updateGroupInput.id);
        if (
          checkAssociatedAdmins &&
          checkAssociatedAdmins.length > 0 &&
          checkAssociatedAdmins[0] !== null
        ) {
          throw `This group cannot be deleted because it is associated with one or more administrators.`;
        }
      }

      const ptGroup =
        await this.ptGroupsService.updateGroupDetails(updateGroupInput);
      let templateID;
      if (ptGroup.group_status === 'Deleted') {
        templateID = 142;
      } else {
        templateID = 141;
      }

      //Generate link to view admin groups.
      const groupLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[17]}` +
        `/edit/${ptGroup.id}` +
        `?from=log`;

      const createActivityLogInput: CreateActivityLogInput = {
        event_template_id: templateID,
        admin_id: decoded?.userId,
        dynamic_values: {
          groupName: ptGroup.group_name,
          groupLink,
        },
        is_admin: true,
        created_by: decoded?.userId,
      };

      await this.activityLogService.insertActivityLog(createActivityLogInput);
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        ptGroup,
      );
    } catch (error) {
      this.logger.error(
        `Errored while inserting project details with message: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.RESTRICTED_PORTAL_ADMIN)
  @Mutation(() => PTGroupResponse, {
    name: 'updateGroupStatus',
    description: 'Updates status of an admin group.',
  })
  async updateGroupStatus(
    @Context() context,
    @Args('id', {
      description:
        'Unique identifier of the admin group whose status is to be updated.',
    })
    id: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for updating status of an admin group with payload: ${id}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const checkAssociatedAdmins =
        await this.ptGroupsService.getAdminDetails(id);
      if (
        checkAssociatedAdmins &&
        checkAssociatedAdmins.length > 0 &&
        checkAssociatedAdmins[0] !== null
      ) {
        throw `This group cannot be deleted because it is associated with one or more administrators.`;
      }

      const ptGroup = await this.ptGroupsService.updateGroupStatus(id);
      const createActivityLogInput: CreateActivityLogInput = {
        event_template_id: 142,
        admin_id: decoded?.userId,
        dynamic_values: {
          groupName: ptGroup.group_name,
        },
        is_admin: true,
        created_by: decoded?.userId,
      };

      await this.activityLogService.insertActivityLog(createActivityLogInput);
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        ptGroup,
      );
    } catch (error) {
      this.logger.error(
        `Errored while inserting project details with message: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => PTGroupMenuResponse, {
    name: 'getGroupDetailsById',
    description: 'Fetches admin group details by ID.',
  })
  async getGroupDetailsById(
    @Args('Id', {
      description: 'Unique identifier of the admin group.',
    })
    id: string,
  ): Promise<any> {
    try {
      const group = await this.ptGroupsService.getGroupDetailsById(id);
      if (group) {
        const response: PTGroupMenu = {
          id: group.id,
          group_name: group.group_name,
          group_description: group.group_description,
          group_status: group.group_status,
          created_on: group.created_on,
          menuPrivileges: group.groupMenuDetails.map((menuDetail) => ({
            menuId: menuDetail.menu_id,
            menuName: menuDetail.adminMenuDetails.menu_name,
            allPermission: menuDetail.all_permission,
            listPermission: menuDetail.list_permission,
            insertPermission: menuDetail.insert_permission,
            updatePermission: menuDetail.update_permission,
            deletePermission: menuDetail.delete_permission,
            exportPermission: menuDetail.export_permission,
            printPermission: menuDetail.print_permission,
            viewPermission: menuDetail.view_permission,
          })),
        };
        return framedResponse(
          'SUCCESS',
          `Response successfully sent back to the client`,
          response,
        );
      } else {
        throw new HttpException('Admin not found', HttpStatus.BAD_REQUEST);
      }
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored inside the client with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.RESTRICTED_PORTAL_ADMIN)
  @Query(() => PTGroupListResponse, {
    name: 'listAllGroups',
    description: 'Lists all admin groups.',
  })
  async listAllGroups(
    @Args('keyword', {
      nullable: true,
      description: 'Search keyword to filter groups by name or description.',
    })
    keyword: string,

    @Args('status', {
      nullable: true,
      description:
        'Status of the group to filter results (e.g., Active, Inactive).',
    })
    status: GroupStatus,

    @Args('page', {
      type: () => Int,
      defaultValue: null,
      nullable: true,
      description: 'Page number for pagination.',
    })
    page: number,

    @Args('perPage', {
      type: () => Int,
      defaultValue: null,
      nullable: true,
      description: 'Number of groups to return per page.',
    })
    perPage: number,

    @Args('isAlphabeticalOrder', {
      nullable: true,
      description: 'Whether to sort groups alphabetically by name.',
    })
    isAlphabeticalOrder: boolean,

    @Args('sortingField', {
      nullable: true,
      description: 'Field name used for sorting the groups.',
    })
    sorting_field: string,

    @Args('sortingOrder', {
      nullable: true,
      defaultValue: 'DESC',
      description: 'Sorting order: ASC or DESC.',
    })
    sorting_order: SortingOrder,
  ): Promise<any> {
    try {
      const { groups, totalCount } = await this.ptGroupsService.listAllGroups(
        keyword,
        status,
        page,
        perPage,
        sorting_field,
        sorting_order,
        isAlphabeticalOrder,
      );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        { groups, totalCount },
      );
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored inside the client with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => SideMenuResponse, {
    name: 'getSideMenusForAdmin',
    description: 'Fetches side menus available for the logged-in admin.',
  })
  async getSideMenusForAdmin(@Context() context): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const sideMenuDetails = await this.ptGroupsService.getSideMenusForAdmin(
        decoded?.id,
      );
      return framedResponse(
        'SUCCESS',
        `Side menus fetched for the Admin successfully`,
        sideMenuDetails,
      );
    } catch (error) {
      const errMsg = error.message ? error.message : error;
      this.logger.error(`Errored inside the client with message: ${errMsg}`);
      return framedResponse('ERROR', errMsg);
    }
  }
}
