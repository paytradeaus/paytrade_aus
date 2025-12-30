import { Resolver, Query, Mutation, Args, Int, Context } from '@nestjs/graphql';
import { CommunicationManagementService } from './communication-management.service';
import { HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { Roles } from '../../../api/auth/role-guard/roles.decorator';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { JwtAuthGuard } from '../../../api/auth/jwt-guard/jwt-auth.guard';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import {
  FetchDetailsOfASystemEmailInput,
  SendSystemEmailInput,
} from './dto/create-communication-management.input';
import {
  FetchAllSystemEmailsResponse,
  FetchDetailsOfASystemEmailResponse,
  SendSystemEmailResponse,
} from './response/communication-management.response';
import {
  CommonSettingsListResponse,
  CommonSettingsResponse,
  CurrencyMasterListResponse,
  CurrencyMastersResponse,
  PTMasterTypeListResponse,
  PTMasterTypesListResponse,
  PTMasterTypesResponse,
  PTMastersResponse,
} from './response/pt-master-types.response';
import { Public } from 'src/api/auth/jwt-guard/public.decorator';
import { FetchAllSystemEmailsInput } from './dto/fetch-all-system-emails.input';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import {
  CreateCommonSettingInput,
  CreateCurrencyMasterInput,
  CreateMasterTypeInput,
} from './dto/create-master-type.input';
import {
  UpdateCommonSettingsInput,
  UpdateCurrencyMasterInput,
  UpdateMasterTypeInput,
} from './dto/update-master-type.input';
import { categoryStatus } from 'src/entities/master-types.entity';
import { settingStatus } from 'src/entities/common-settings.entity';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { linkExtensions } from 'src/api/common/activity-log/link-extensions';
import { CreateActivityLogInput } from 'src/api/common/activity-log/dto/create-activity-log.input';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { SortingOrder } from '../pt-admin/dto/add-admin.dto';
@Resolver()
export class CommunicationManagementResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly communicationManagementService: CommunicationManagementService,
    private activityLogService: ActivityLogService,
  ) {
    this.logger = new PaytradeLogger('ADMIN_RESOLVER');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => SendSystemEmailResponse, {
    name: 'sendSystemEmailToTheClients',
    description: 'Sends a system email to specified clients.',
  })
  async sendSystemEmailToTheClients(
    @Context() context,
    @Args('payload', {
      description: 'Input parameters for sending system email to clients',
    })
    payload: SendSystemEmailInput,
  ) {
    try {
      this.logger.log(
        `Request received for sending email to the client wth data: ${JSON.stringify(payload)}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      return await this.communicationManagementService.sendSystemEmailToTheClients(
        decoded,
        payload,
      );
    } catch (error) {
      this.logger.error(
        `Errored while sending email to the client with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while sending email to the client with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Query(() => FetchDetailsOfASystemEmailResponse, {
    name: 'fetchEmailDetails',
    description:
      'Fetches detailed information of a specific system email using its ID.',
  })
  async fetchDetailsOfASystemEmail(
    @Args('payload', {
      description: 'Input parameters containing the email ID to fetch',
    })
    payload: FetchDetailsOfASystemEmailInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching details of a system email wth data: ${JSON.stringify(payload)}`,
      );

      return this.communicationManagementService.fetchDetailsOfASystemEmail(
        payload.id,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching details of a system email with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching details of a system email with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Query(() => FetchAllSystemEmailsResponse, {
    name: 'fetchAllEmailsSentByAdmin',
    description: 'Fetches all system emails sent by the admin.',
  })
  async fetchAllSystemEmailsSentByAdmin(
    @Context() context,
    @Args('payload', {
      description:
        'Input parameters for fetching all system emails sent by admin',
    })
    payload: FetchAllSystemEmailsInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching all system emails sent by admin with data: ${JSON.stringify(payload)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const timezone = decoded?.timezone || 'UTC';
      return this.communicationManagementService.fetchAllSystemEmailsSentByAdmin(
        payload,
        timezone,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all system emails sent by admin with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching all system emails sent by admin with message: ${error.message}`,
      );
    }
  }

  //API to be removed afterwards
  @Public()
  @Query(() => PTMasterTypesListResponse, {
    name: 'adminfetchAllMasterTypeDetails',
    description: 'Fetches all master type details.',
  })
  async adminfetchAllMasterTypeDetails(
    @Args('MasterType', {
      nullable: true,
      description:
        'Optional filter to fetch details of a specific master type.',
    })
    master_type: string,
  ) {
    try {
      this.logger.log(
        `Request received for fetching details of MaterType: ${JSON.stringify(master_type)}`,
      );

      const masterTypesDetails =
        await this.communicationManagementService.getMasterTypeDetails(
          master_type,
        );
      return framedResponse(
        'SUCCESS',
        `All mastertype data fetched.`,
        masterTypesDetails,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching details of MaterType: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching details of MaterType ${error.message}`,
      );
    }
  }

  //new API with pagination
  @Public()
  @Query(() => PTMasterTypeListResponse, {
    name: 'adminListAllMasterTypeDetails',
    description: 'Fetches master type details.',
  })
  async adminListAllMasterTypeDetails(
    @Args('MasterType', {
      nullable: true,
      description:
        'Optional filter to fetch details of a specific master type.',
    })
    master_type: string,

    @Args('keyword', {
      nullable: true,
      description: 'Keyword to filter master types by name or description.',
    })
    keyword: string,

    @Args('status', {
      nullable: true,
      description: 'Optional filter to fetch master types by status.',
    })
    status: categoryStatus,

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
      description: 'Number of records per page.',
    })
    perPage: number,

    @Args('sortingField', {
      nullable: true,
      description: 'Field by which to sort the results.',
    })
    sorting_field: string,

    @Args('sortingOrder', {
      nullable: true,
      defaultValue: 'ASC',
      description: 'Sorting order: ASC or DESC.',
    })
    sorting_order: SortingOrder,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for fetching details of MaterType: ${JSON.stringify(master_type)}`,
      );

      const { MasterTypeDetails, totalCount } =
        await this.communicationManagementService.getMasterTypesDetails(
          master_type,
          keyword,
          status,
          page,
          perPage,
          sorting_field,
          sorting_order,
        );
      return framedResponse('SUCCESS', `All mastertype data fetched.`, {
        MasterTypeDetails,
        totalCount,
      });
    } catch (error) {
      this.logger.error(
        `Errored while fetching details of MaterType: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching details of MaterType ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => PTMasterTypesResponse, {
    name: 'adminGetMasterTypeById',
    description: 'Fetches details of a master type by its ID.',
  })
  async adminGetMasterTypeById(
    @Args('category_id', {
      description: 'Unique ID of the master type to fetch.',
    })
    category_id: string,
  ): Promise<any> {
    try {
      const masterTypeDetails =
        await this.communicationManagementService.getMasterTypebyId(
          category_id,
        );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        masterTypeDetails,
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
  @Query(() => PTMastersResponse, {
    name: 'adminfetchAllMasters',
    description: 'Fetches all master entries available in the system.',
  })
  async adminfetchAllMasters() {
    try {
      this.logger.log(`Request received for fetching all Maters`);

      const masters = await this.communicationManagementService.getMasters();
      return framedResponse('SUCCESS', `All mastertype data fetched.`, masters);
    } catch (error) {
      this.logger.error(
        `Errored while fetching details of MaterType: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching details of MaterType ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => PTMasterTypesResponse, {
    name: 'adminAddMasterTypeDetails',
    description: 'Adds a new master type entry.',
  })
  async adminAddMasterTypeDetails(
    @Context() context,
    @Args('masterTypes', { description: 'Details of the master type to add' })
    master_type_details: CreateMasterTypeInput,
  ) {
    try {
      this.logger.log(
        `Request received for add new category to the masters with data: ${JSON.stringify(master_type_details)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const masterTypeDetails =
        await this.communicationManagementService.adminAddMasterTypes(
          master_type_details,
        );

      //Generating link to view inserted master type details.
      const categoryValueLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[29]}` +
        `${masterTypeDetails.id}` +
        `?from=log`;

      const createActivityLogInput: CreateActivityLogInput = {
        event_template_id: 154,
        admin_id: decoded?.userId,
        dynamic_values: {
          categoryValue: masterTypeDetails.value,
          categoryValueLink,
          masterType: masterTypeDetails.master_type,
        },
        is_admin: true,
        created_by: decoded?.userId,
      };
      await this.activityLogService.insertActivityLog(createActivityLogInput);

      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        masterTypeDetails,
      );
    } catch (error) {
      this.logger.error(
        `Errored while adding new category to the masters with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while adding new category to the masters with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.RESTRICTED_PORTAL_ADMIN)
  @Query(() => PTMasterTypesResponse, {
    name: 'checkCategoryNameExistence',
    description: 'Checks if a category name exists for a given master type.',
  })
  async checkCategoryNameExistence(
    @Args('master_type', {
      description: 'The master type under which to check the category.',
    })
    master_type: string,

    @Args('category', {
      description: 'The category name to check for existence.',
    })
    category: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: category: ${category}`,
      );
      const categoryDetails =
        await this.communicationManagementService.getCategoryByName(
          master_type,
          category,
        );
      if (categoryDetails) {
        return framedResponse(
          'SUCCESS',
          `Response successfully sent back to the client`,
          categoryDetails,
        );
      } else {
        throw new HttpException(
          'Category not found in the given master_type',
          HttpStatus.BAD_REQUEST,
        );
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
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => PTMasterTypesResponse, {
    name: 'adminUpdateMasterTypeDetails',
    description: 'Updates an existing master type entry.',
  })
  async adminUpdateMasterTypeDetails(
    @Context() context,
    @Args('masterTypes', {
      description: 'Details of the master type to update',
    })
    master_type_details: UpdateMasterTypeInput,
  ) {
    try {
      this.logger.log(
        `Request received to update a category data in the masters with data: ${JSON.stringify(master_type_details)}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const masterTypeDetails =
        await this.communicationManagementService.adminUpdateMasterTypes(
          master_type_details,
        );
      if (masterTypeDetails) {
        //Generating link to view inserted master type details.
        const categoryValueLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[29]}` +
          `${masterTypeDetails.id}` +
          `?from=log`;

        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: 155,
          admin_id: decoded?.userId,
          dynamic_values: {
            categoryValue: masterTypeDetails.value,
            categoryValueLink,
            masterType: masterTypeDetails.master_type,
          },
          is_admin: true,
          created_by: decoded?.userId,
        };
        await this.activityLogService.insertActivityLog(createActivityLogInput);
        return framedResponse(
          'SUCCESS',
          `Response successfully sent back to the client`,
          masterTypeDetails,
        );
      } else {
        throw new HttpException('Update Failed', HttpStatus.BAD_REQUEST);
      }
    } catch (error) {
      this.logger.error(
        `Errored while updating a category in the masters with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while updating a category in the masters with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => CurrencyMastersResponse, {
    name: 'adminAddCurrencyMaterDetails',
    description: 'Adds a new currency master entry.',
  })
  async adminAddCurrencyMaterDetails(
    @Context() context,
    @Args('currencyMaster', {
      description: 'Details of the currency master to add',
    })
    currency_master_details: CreateCurrencyMasterInput,
  ) {
    try {
      this.logger.log(
        `Request received for add new category to the masters with data: ${JSON.stringify(currency_master_details)}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const CurrencyMasterDetails =
        await this.communicationManagementService.adminAddCurrencyMaster(
          currency_master_details,
        );

      //Generating link to view inserted master type details.
      const currencyLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[30]}` +
        `${CurrencyMasterDetails.id}` +
        `?from=log`;

      const createActivityLogInput: CreateActivityLogInput = {
        event_template_id: 156,
        admin_id: decoded?.userId,
        dynamic_values: {
          currencyName: CurrencyMasterDetails.currency_name,
          currencyLink,
        },
        is_admin: true,
        created_by: decoded?.userId,
      };
      await this.activityLogService.insertActivityLog(createActivityLogInput);

      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        CurrencyMasterDetails,
      );
    } catch (error) {
      this.logger.error(
        `Errored while adding new category to the masters with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while adding new category to the masters with message: ${error.message}`,
      );
    }
  }

  @Public()
  @Query(() => CurrencyMasterListResponse, {
    name: 'adminListAllCurrencyMasterDetails',
    description: 'Fetches currency master entries.',
  })
  async adminListAllCurrencyMasterDetails(
    @Args('keyword', {
      nullable: true,
      description:
        'Optional keyword to filter currency master entries by name or code.',
    })
    keyword: string,

    @Args('status', {
      nullable: true,
      description:
        'Optional status filter to fetch active/inactive currency entries.',
    })
    status: categoryStatus,

    @Args('page', {
      type: () => Int,
      defaultValue: null,
      nullable: true,
      description: 'Optional page number for pagination.',
    })
    page: number,

    @Args('perPage', {
      type: () => Int,
      defaultValue: null,
      nullable: true,
      description: 'Optional number of items per page for pagination.',
    })
    perPage: number,

    @Args('sortingField', {
      nullable: true,
      description: 'Optional field name to sort the results by.',
    })
    sorting_field: string,

    @Args('sortingOrder', {
      nullable: true,
      defaultValue: 'DESC',
      description: 'Sorting order for the results: ASC or DESC.',
    })
    sorting_order: SortingOrder,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for fetching details of currency masters`,
      );

      const { currencyMasters, totalCount } =
        await this.communicationManagementService.getCurrencyMasterList(
          keyword,
          status,
          page,
          perPage,
          sorting_field,
          sorting_order,
        );
      return framedResponse('SUCCESS', `All currency master data fetched.`, {
        currencyMasters,
        totalCount,
      });
    } catch (error) {
      this.logger.error(
        `Errored while fetching details of currency masters: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching details of currency masters ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => CurrencyMastersResponse, {
    name: 'adminUpdateCurrencyMastesDetails',
    description: 'Updates an existing currency master entry.',
  })
  async adminUpdateCurrencyMastesDetails(
    @Context() context,
    @Args('currencyMaster', {
      description: 'Details of the currency master to update',
    })
    currency_master_details: UpdateCurrencyMasterInput,
  ) {
    try {
      this.logger.log(
        `Request received to update a currency masters with data: ${JSON.stringify(currency_master_details)}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const currencyDetails =
        await this.communicationManagementService.adminUpdateCurrencyMasters(
          currency_master_details,
        );
      if (currencyDetails) {
        //Generating link to view inserted master type details.
        const currencyLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[30]}` +
          `${currencyDetails.id}` +
          `?from=log`;

        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: 157,
          admin_id: decoded?.userId,
          dynamic_values: {
            currencyName: currencyDetails.currency_name,
            currencyLink,
          },
          is_admin: true,
          created_by: decoded?.userId,
        };
        await this.activityLogService.insertActivityLog(createActivityLogInput);
        return framedResponse(
          'SUCCESS',
          `Response successfully sent back to the client`,
          currencyDetails,
        );
      } else {
        throw new HttpException('Update Failed', HttpStatus.BAD_REQUEST);
      }
    } catch (error) {
      this.logger.error(
        `Errored while updating a category in the masters with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while updating a category in the masters with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.RESTRICTED_PORTAL_ADMIN)
  @Query(() => CurrencyMastersResponse, {
    name: 'checkCurrencyNameExistence',
    description: 'Checks if a currency name already exists.',
  })
  async checkCurrencyNameExistence(
    @Args('currency', {
      description: 'The full name of the currency to check for existence.',
    })
    currency: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: currency: ${currency}`,
      );
      const currencyData =
        await this.communicationManagementService.checkCurrencyName(currency);
      if (currencyData) {
        return framedResponse(
          'SUCCESS',
          `Response successfully sent back to the client`,
          currencyData,
        );
      } else {
        throw new HttpException(
          ' Currency Name doesnot exist',
          HttpStatus.BAD_REQUEST,
        );
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
  @Query(() => CurrencyMastersResponse, {
    name: 'checkCurrencyShortCodeExistence',
    description: 'Checks if a currency code already exists.',
  })
  async checkCurrencyShortCodeExistence(
    @Args('currency_code', {
      description:
        'The short code (e.g., USD, EUR) of the currency to check for existence.',
    })
    currency_code: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: currency: ${currency_code}`,
      );
      const currencyData =
        await this.communicationManagementService.checkCurrencyCode(
          currency_code,
        );
      if (currencyData) {
        return framedResponse(
          'SUCCESS',
          `Response successfully sent back to the client`,
          currencyData,
        );
      } else {
        throw new HttpException(
          ' Currency Name doesnot exist',
          HttpStatus.BAD_REQUEST,
        );
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
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => CurrencyMastersResponse, {
    name: 'adminGetCurrencyById',
    description: 'Fetches currency master details by its ID.',
  })
  async adminGetCurrencyById(
    @Args('currency_id', {
      description:
        'The unique identifier of the currency master entry to fetch.',
    })
    currency_id: string,
  ): Promise<any> {
    try {
      const currencyDetails =
        await this.communicationManagementService.getCurrencyMasterbyId(
          currency_id,
        );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        currencyDetails,
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
  @Mutation(() => CommonSettingsResponse, {
    name: 'adminAddCommonSettingsDetails',
    description: 'Adds a new common setting entry.',
  })
  async adminAddCommonSettingsDetails(
    @Args('commonSetting', {
      description: 'Details of the common setting to add',
    })
    common_setting_details: CreateCommonSettingInput,
  ) {
    try {
      this.logger.log(
        `Request received for add new setting with data: ${JSON.stringify(common_setting_details)}`,
      );

      const settingsDetails =
        await this.communicationManagementService.adminAddCommonSettings(
          common_setting_details,
        );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        settingsDetails,
      );
    } catch (error) {
      this.logger.error(
        `Errored while adding new settings with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while adding new settings with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => CommonSettingsResponse, {
    name: 'adminUpdateCommonSettingsDetails',
    description: 'Updates an existing common setting entry.',
  })
  async adminUpdateCommonSettingsDetails(
    @Args('common_setting_update', {
      description: 'Details of the common setting to update',
    })
    common_setting_update: UpdateCommonSettingsInput,
  ) {
    try {
      this.logger.log(
        `Request received to update a common setting with data: ${JSON.stringify(common_setting_update)}`,
      );

      const settingsDetails =
        await this.communicationManagementService.adminUpdateCommonSettings(
          common_setting_update,
        );
      if (settingsDetails) {
        return framedResponse(
          'SUCCESS',
          `Response successfully sent back to the client`,
          settingsDetails,
        );
      } else {
        throw new HttpException('Update Failed', HttpStatus.BAD_REQUEST);
      }
    } catch (error) {
      this.logger.error(
        `Errored while updating a setting with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while updating a setting with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => CommonSettingsListResponse, {
    name: 'adminListAllCommonSettingsDetails',
    description: 'Fetches all common settings.',
  })
  async adminListAllCommonSettingsDetails(
    @Args('keyword', {
      nullable: true,
      description:
        'Optional keyword to filter common settings by name or description.',
    })
    keyword: string,

    @Args('status', {
      nullable: true,
      description:
        'Optional status filter for common settings (e.g., ACTIVE/INACTIVE).',
    })
    status: settingStatus,

    @Args('page', {
      type: () => Int,
      defaultValue: null,
      nullable: true,
      description: 'Page number for pagination, starting from 1.',
    })
    page: number,

    @Args('perPage', {
      type: () => Int,
      defaultValue: null,
      nullable: true,
      description: 'Number of records to return per page.',
    })
    perPage: number,
  ): Promise<any> {
    try {
      const skip = (page - 1) * perPage;
      const take = perPage;

      this.logger.log(
        `Request received for fetching details of currency masters`,
      );

      const { commonSettings, totalCount } =
        await this.communicationManagementService.getCommonSettingsList(
          keyword,
          status,
          skip,
          take,
        );
      return framedResponse('SUCCESS', `All common settings fetched.`, {
        commonSettings,
        totalCount,
      });
    } catch (error) {
      this.logger.error(
        `Errored while fetching details of settings: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => CommonSettingsResponse, {
    name: 'adminGetSettingsById',
    description: 'Fetches common setting details by its ID.',
  })
  async adminGetSettingsById(
    @Args('settings_id', {
      description: 'The unique identifier of the common setting to fetch.',
    })
    settings_id: string,
  ): Promise<any> {
    try {
      const settingDetails =
        await this.communicationManagementService.getCommonSettingsbyId(
          settings_id,
        );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        settingDetails,
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
  @Roles(Role.PORTAL_ADMIN, Role.RESTRICTED_PORTAL_ADMIN)
  @Query(() => CommonSettingsResponse, {
    name: 'checkSettingsNameExistence',
    description:
      'Checks if a common setting with the given name already exists.',
  })
  async checkSettingsNameExistence(
    @Args('settings', {
      description: 'The name of the common setting to check for existence.',
    })
    settings: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: settings: ${settings}`,
      );
      const settingsData =
        await this.communicationManagementService.checkSettingName(settings);
      if (settingsData) {
        return framedResponse(
          'SUCCESS',
          `Response successfully sent back to the client`,
          settingsData,
        );
      } else {
        throw new HttpException(
          ' Currency Name doesnot exist',
          HttpStatus.BAD_REQUEST,
        );
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
}
