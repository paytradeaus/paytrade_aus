import { Args, Mutation, Resolver, Query, Int, Context } from '@nestjs/graphql';
import { PtSubscriptionService } from './pt-subscription.service';
import { HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import {
  PtSubscriptionItemListResponse,
  PtSubscriptionItemResponse,
} from './response/subscription-item.response';
import { AddSubscriptionItemInput } from './dto/add-subscription-item.dto';
import { UpdateSubscriptionItemInput } from './dto/update-subsciption-item.dto';
import {
  CheckPlanExistenceResponse,
  PtSubscriptionPlanResponse,
  SubscribedUsersListResponse,
  SubscriptionPlanListForUserResponse,
  SubscriptionPlanListResponse,
  SubscriptionPricingPlanResponse,
} from './response/subscription-plan.response';
import {
  AddSubscriptionPlanInput,
  GetAllSubscribedUsersInput,
  GetAllSubscriptionPlanInput,
} from './dto/add-subscription-plan.dto';
import { handleError } from 'src/api/common/error-handler';
import { UpdateSubscriptionPlanInput } from './dto/update-subscription-plan.dto';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { CreateActivityLogInput } from 'src/api/common/activity-log/dto/create-activity-log.input';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { GetSubscriptionPlansResponse } from 'src/api/common/payment-gateway/response/stripe-plans-synced.response';
import { linkExtensions } from 'src/api/common/activity-log/link-extensions';
import { Public } from 'src/api/auth/jwt-guard/public.decorator';
import { SortingOrder } from '../pt-admin/dto/add-admin.dto';
import { StringResponse } from 'src/api/users/signup/response/auth.response';
import { GiftSubscriptionInput } from './dto/gift-subscription.dto';
import { AddGiftCouponInput } from './dto/add-stripe-coupon.dto';
import {
  CheckGiftCouponExistenceResponse,
  GiftCouponByIdResponse,
  GiftCouponListResponse,
  ValidateCouponByNameResponse,
} from './response/gift-coupon.response';
import { UpdateStripeCouponInput } from './dto/update-stripe-coupon';
import { CompanyAppliedCouponListResponse } from './response/company-applied-coupon.response';
var errorMessage = '';

@Resolver()
export class PtSubscriptionResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly ptSubscriptionService: PtSubscriptionService,
    private readonly activityLogService: ActivityLogService,
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
  @Roles(Role.PORTAL_ADMIN, Role.RESTRICTED_PORTAL_ADMIN)
  @Query(() => PtSubscriptionItemResponse, {
    name: 'checkSubscriptionItemNameExistence',
    description: 'Checks if a subscription item name already exists.',
  })
  async checkSubscriptionItemNameExistence(
    @Args('item_name', {
      description: 'Name of the subscription item to check for existence.',
    })
    item_name: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: plan_name:: ${item_name}`,
      );
      const itemDetails =
        await this.ptSubscriptionService.checkSubscriptionItemNameExistence(
          item_name,
        );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        itemDetails,
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
  @Mutation(() => PtSubscriptionItemResponse, {
    name: 'adminAddSubsciptionItem',
    description: 'Adds a new subscription item.',
  })
  async adminAddSubsciptionItem(
    @Context() context,
    @Args('addSubscriptionItemInput', {
      description:
        'Input payload containing details required to create a new subscription item, such as name, pricing, duration, and status.',
    })
    addSubscriptionItemInput: AddSubscriptionItemInput,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const newSubscriptionItem =
        await this.ptSubscriptionService.insertSubscriptionItem(
          decoded,
          addSubscriptionItemInput,
        );
      if (newSubscriptionItem) {
        //Generating link to view created subscription plan.
        const itemLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[28]}` +
          newSubscriptionItem.id +
          `?from=log`;

        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: 37,
          admin_id: decoded?.userId,
          dynamic_values: {
            subscriptionItemName: newSubscriptionItem.item_name,
            itemLink,
          },
          is_admin: true,
          created_by: decoded?.userId,
        };
        await this.activityLogService.insertActivityLog(createActivityLogInput);
        return framedResponse(
          'SUCCESS',
          `Response successfully sent back to the client`,
          newSubscriptionItem,
        );
      } else {
        throw new Error(`Add Subscription Item failed`);
      }
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
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
  @Mutation(() => PtSubscriptionItemResponse, {
    name: 'adminUpdateSubsciptionItem',
    description: 'Updates an existing subscription item.',
  })
  async adminUpdateSubsciptionItem(
    @Context() context,
    @Args('updateSubscriptionItemInput', {
      description:
        'Input payload containing updated details of an existing subscription item, including status, pricing, or metadata.',
    })
    updateSubscriptionItemInput: UpdateSubscriptionItemInput,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const pvsStatus = (
        await this.ptSubscriptionService.getSubsciptionItemById(
          updateSubscriptionItemInput.id,
        )
      ).item_status;

      const SubscriptionItem =
        await this.ptSubscriptionService.updateSubscriptionItem(
          decoded,
          updateSubscriptionItemInput,
        );
      //Generating link to view updated subscription plan.
      const itemLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[28]}` +
        SubscriptionItem.id +
        `?from=log`;

      if (
        updateSubscriptionItemInput.item_status &&
        SubscriptionItem.item_status != pvsStatus &&
        SubscriptionItem.item_status === 'Deleted'
      ) {
        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: 187,
          admin_id: decoded?.userId,
          dynamic_values: {
            subscriptionItemName: SubscriptionItem.item_name,
            itemLink,
          },
          is_admin: true,
          created_by: decoded?.userId,
        };
        await this.activityLogService.insertActivityLog(createActivityLogInput);
      } else {
        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: 38,
          admin_id: decoded?.userId,
          dynamic_values: {
            subscriptionItemName: SubscriptionItem.item_name,
            itemLink,
          },
          is_admin: true,
          created_by: decoded?.userId,
        };
        await this.activityLogService.insertActivityLog(createActivityLogInput);
      }
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        SubscriptionItem,
      );
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
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
  @Query(() => PtSubscriptionItemResponse, {
    name: 'adminGetSubsciptionItemById',
    description: 'Fetches a subscription item by ID.',
  })
  async adminGetSubsciptionItemById(
    @Args('id', {
      description: 'Unique identifier of the subscription item.',
    })
    id: string,
  ): Promise<any> {
    try {
      const SubscriptionItem =
        await this.ptSubscriptionService.getSubsciptionItemById(id);
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        SubscriptionItem,
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
  @Roles(
    Role.RESTRICTED_PORTAL_ADMIN,
    Role.PORTAL_ADMIN,
    Role.BASIC_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.STANDARD_USER,
  )
  @Query(() => PtSubscriptionItemListResponse, {
    name: 'adminListSubscriptionItems',
    description: 'Lists all subscription items.',
  })
  async adminListSubscriptionItems(
    @Args('keyword', {
      nullable: true,
      description:
        'Keyword to search subscription items by name or description.',
    })
    keyword: string,

    @Args('status', {
      nullable: true,
      description: 'Filter subscription items by status.',
    })
    status: string,

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
      description: 'Number of subscription items per page.',
    })
    perPage: number,

    @Args('sortingField', {
      nullable: true,
      description: 'Field name to sort subscription items.',
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
      const { subscriptionItems, totalCount } =
        await this.ptSubscriptionService.adminlistSubscriptionItems(
          keyword,
          status,
          page,
          perPage,
          sorting_field,
          sorting_order,
        );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        { subscriptionItems, totalCount },
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
  @Query(() => CheckPlanExistenceResponse, {
    name: 'checkSubscriptionPlanExistence',
    description: 'Checks if a subscription plan already exists.',
  })
  async checkSubscriptionPlanExistence(
    @Args('keyword', {
      description: 'Subscription plan name or keyword to check existence.',
    })
    keyword: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: keyword:: ${keyword}`,
      );
      const planDetails =
        await this.ptSubscriptionService.checkSubscriptionPlanExistence(
          keyword,
        );
      this.logger.log(
        `Response recieved while calling the checkSubscriptionPlanExistence method: ${JSON.stringify(planDetails)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        planDetails,
      );
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.RESTRICTED_PORTAL_ADMIN)
  @Mutation(() => PtSubscriptionPlanResponse, {
    name: 'adminAddSubscriptionAndPricing',
    description: 'Adds a new subscription plan and pricing.',
  })
  async adminAddSubscriptionAndPricing(
    @Context() context,
    @Args('addSubscriptionPlanInput', {
      description:
        'Input payload containing subscription plan details along with associated pricing configuration to create a new plan.',
    })
    addSubscriptionPlanInput: AddSubscriptionPlanInput,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const newSubscription =
        await this.ptSubscriptionService.adminAddSubscriptionAndPricing(
          addSubscriptionPlanInput,
          decoded,
        );
      if (newSubscription) {
        //Generating link to view created subscription plan.
        const planLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[26]}` +
          newSubscription.id +
          `?from=log`;

        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: 39,
          admin_id: decoded?.userId,
          dynamic_values: {
            subscriptionPlanName: newSubscription.plan_name,
            planLink,
          },
          is_admin: true,
          created_by: decoded?.userId,
        };
        await this.activityLogService.insertActivityLog(createActivityLogInput);
        return framedResponse(
          'SUCCESS',
          `The Subscription Plan has been added.`,
          newSubscription,
        );
      } else {
        throw new Error(`Failed to add Subscription Plan.`);
      }
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
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
  @Mutation(() => PtSubscriptionPlanResponse, {
    name: 'adminUpdateSubscriptionAndPricing',
    description: 'Updates an existing subscription plan and pricing.',
  })
  async adminUpdateSubscriptionAndPricing(
    @Context() context,
    @Args('updateSubscriptionPlanInput', {
      description:
        'Input payload containing updated subscription plan and pricing details for an existing plan.',
    })
    updateSubscriptionPlanInput: UpdateSubscriptionPlanInput,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const SubscriptionPlan =
        await this.ptSubscriptionService.adminUpdateSubscriptionAndPricing(
          updateSubscriptionPlanInput,
          decoded,
        );

      //Generating link to view updated subscription plan.
      const planLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[27]}` +
        SubscriptionPlan.id +
        `?from=log`;

      const createActivityLogInput: CreateActivityLogInput = {
        event_template_id: 40,
        admin_id: decoded?.userId,
        dynamic_values: {
          subscriptionPlanName: SubscriptionPlan.plan_name,
          planLink,
        },
        is_admin: true,
        created_by: decoded?.userId,
      };
      await this.activityLogService.insertActivityLog(createActivityLogInput);
      return framedResponse(
        'SUCCESS',
        `The Subscription Plan has been updated.`,
        SubscriptionPlan,
      );
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
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
  @Mutation(() => PtSubscriptionPlanResponse, {
    name: 'adminArchiveSubscriptionAndPricing',
    description: 'Archives or unarchives a subscription plan.',
  })
  async adminArchiveSubscriptionAndPricing(
    @Context() context,
    @Args('id', {
      description: 'Unique identifier of the subscription plan.',
    })
    id: string,

    @Args('is_archived', {
      nullable: true,
      defaultValue: true,
      description:
        'Indicates whether the subscription plan should be archived.',
    })
    is_archived?: boolean,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      is_archived = is_archived == null ? true : is_archived;
      const SubscriptionPlan =
        await this.ptSubscriptionService.adminArchiveSubscriptionAndPricing(
          id,
          decoded,
          is_archived,
        );

      //Generating link to view updated subscription plan.
      const planLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[38]}` +
        SubscriptionPlan.id +
        `?from=log`;

      const createActivityLogInput: CreateActivityLogInput = {
        event_template_id: is_archived ? 41 : 193,
        admin_id: decoded?.userId,
        dynamic_values: {
          subscriptionPlanName: SubscriptionPlan.plan_name,
          planLink,
        },
        is_admin: true,
        created_by: decoded?.userId,
      };
      await this.activityLogService.insertActivityLog(createActivityLogInput);

      return framedResponse(
        'SUCCESS',
        `The Subscription Plan has been ${is_archived ? 'archived' : 'unarchived'}.`,
        SubscriptionPlan,
      );
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
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
    Role.BASIC_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.STANDARD_USER,
  )
  @Query(() => SubscriptionPlanListResponse, {
    name: 'getAllSubscriptionPlanList',
    description: 'Fetches all subscription plans.',
  })
  async getAllSubscriptionPlanList(
    @Args('getAllSubscriptionPlanInput', {
      description:
        'Input payload containing filters, pagination, and sorting options to retrieve the list of subscription plans.',
    })
    getAllSubscriptionPlanInput: GetAllSubscriptionPlanInput,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: ${JSON.stringify(getAllSubscriptionPlanInput)}`,
      );
      const subscriptionLists =
        await this.ptSubscriptionService.getAllSubscriptionPlanList(
          getAllSubscriptionPlanInput,
        );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(subscriptionLists)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        subscriptionLists,
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

  @Public()
  @Query(() => SubscriptionPlanListForUserResponse, {
    name: 'getAllSubscriptionPlanListForUser',
    description: 'Fetches all subscription plans available for users.',
  })
  async getAllSubscriptionPlanListForUser() {
    try {
      this.logger.log(`Request recieved while entering the client`);
      const subscriptionLists =
        await this.ptSubscriptionService.getAllSubscriptionPlanListForUser();
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(subscriptionLists)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        subscriptionLists,
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
  @Roles(
    Role.RESTRICTED_PORTAL_ADMIN,
    Role.PORTAL_ADMIN,
    Role.BASIC_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.STANDARD_USER,
  )
  @Query(() => SubscriptionPricingPlanResponse, {
    name: 'viewSubscriptionPlanById',
    description: 'Fetches subscription plan details by ID.',
  })
  async viewSubscriptionPlanById(
    @Args('id', {
      description: 'Unique identifier of the subscription plan.',
    })
    id: string,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: ${id}`,
      );
      const subscriptionDetails =
        await this.ptSubscriptionService.viewSubscriptionPlanById(id);
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(subscriptionDetails)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        subscriptionDetails,
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
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => SubscribedUsersListResponse, {
    name: 'getAllSubscribedUsersList',
    description: 'Lists all users subscribed to a plan.',
  })
  async getAllSubscribedUsersList(
    @Context() context,
    @Args('getAllSubscribedUsersInput', {
      description:
        'Input payload containing filters, pagination, and timezone details to retrieve the list of subscribed users.',
    })
    getAllSubscribedUsersInput: GetAllSubscribedUsersInput,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: ${JSON.stringify(getAllSubscribedUsersInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const timezone = decoded?.timezone || getAllSubscribedUsersInput.timezone;
      const subscribedUsersList =
        await this.ptSubscriptionService.getAllSubscribedUsersList(
          getAllSubscribedUsersInput,
          timezone,
        );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(subscribedUsersList)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        subscribedUsersList,
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

  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(
  //   Role.RESTRICTED_PORTAL_ADMIN,
  //   Role.PORTAL_ADMIN,
  //   Role.STANDARD_USER,
  //   Role.ADMIN,
  //   Role.PRIMARY_ADMIN,
  // )
  // @Query(() => GetSubscriptionPlansResponse, {
  //   name: 'getSubscriptionPlans',
  // })
  // async getSubscriptionPlans() {
  //   try {
  //     this.logger.log(
  //       `Request received for fetching subscription plans for a dropdown.`,
  //     );
  //     return this.ptSubscriptionService.getSubscriptionPlans();
  //   } catch (error) {
  //     this.logger.error(
  //       `Errored while fetching subscription plans for a dropdown with message: ${error.message}`,
  //     );
  //     return framedResponse(
  //       'ERROR',
  //       `Errored while fetching subscription plans for a dropdown with message: ${error.message}`,
  //     );
  //   }
  // }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'giftSubscriptionToBusiness',
    description: 'Gifts a subscription plan to a business.',
  })
  async giftSubscriptionToBusiness(
    @Context() context,
    @Args('payload', {
      description:
        'Input payload containing business identifier and subscription plan details to gift a subscription to a business.',
    })
    payload: GiftSubscriptionInput,
  ) {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const response =
        await this.ptSubscriptionService.giftSubscriptionToBusiness(
          payload,
          decoded,
        );

      if (response) {
        return framedResponse(
          'SUCCESS',
          `The subscription has been successfully upgraded. All features are now active.`,
        );
      } else {
        throw new Error(
          `We were unable to complete the business gift subscription upgrade. Please try again.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
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
  @Query(() => CheckGiftCouponExistenceResponse, {
    name: 'checkGiftCouponExistence',
    description: 'Checks if a gift coupon already exists.',
  })
  async checkGiftCouponExistence(
    @Args('keyword', {
      description: 'Gift coupon code or keyword to check existence.',
    })
    keyword: string,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: keyword:: ${keyword}`,
      );

      const couponDetail =
        await this.ptSubscriptionService.checkGiftCouponExistence(keyword);

      this.logger.log(
        `Response recieved while calling the checkGiftCouponExistence method: ${JSON.stringify(couponDetail)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        couponDetail,
      );
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
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
  @Mutation(() => StringResponse, {
    name: 'addGiftCoupon',
    description: 'Adds a new gift coupon.',
  })
  async addGiftCoupon(
    @Context() context,
    @Args('payload', {
      description:
        'Input payload containing gift coupon details such as coupon code, discount value, validity, and usage limits.',
    })
    payload: AddGiftCouponInput,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: keyword:: ${JSON.stringify(payload)}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const adddedCoupon = await this.ptSubscriptionService.addGiftCoupon(
        payload,
        decoded,
      );

      if (adddedCoupon) {
        return framedResponse('SUCCESS', `The Gift coupon has been added.`);
      } else {
        throw new Error(`Failed to add coupon.`);
      }
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
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
  @Mutation(() => StringResponse, {
    name: 'adminUpdateGiftCoupon',
    description: 'Updates or deletes an existing gift coupon.',
  })
  async adminUpdateGiftCoupon(
    @Context() context,
    @Args('payload', {
      description:
        'Input payload containing updated gift coupon details, including status changes or deletion information.',
    })
    payload: UpdateStripeCouponInput,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: keyword:: ${JSON.stringify(payload)}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response = await this.ptSubscriptionService.adminUpdateGiftCoupon(
        payload,
        decoded,
      );

      if (response) {
        this.logger.log(
          `Response recieved while calling the adminUpdateGiftCoupon method: ${JSON.stringify(response)}`,
        );

        return framedResponse(
          'SUCCESS',
          payload.coupon_status === 'Deleted'
            ? 'The Gift coupon has been deleted.'
            : `The Gift coupon has been updated.`,
        );
      } else {
        throw new Error(`Failed to update coupon.`);
      }
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
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
  @Query(() => GiftCouponByIdResponse, {
    name: 'adminGiftCouponById',
    description: 'Fetches a gift coupon by its ID.',
  })
  async adminGiftCouponById(
    @Args('id', {
      description: 'Unique identifier of the gift coupon.',
    })
    id: string,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: keyword:: ${id}`,
      );

      const couponDetail =
        await this.ptSubscriptionService.adminGiftCouponById(id);

      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        couponDetail,
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
  @Query(() => GiftCouponListResponse, {
    name: 'adminGiftCouponList',
    description: 'Lists all gift coupons.',
  })
  async adminGiftCouponList(
    @Args('keyword', {
      nullable: true,
      description: 'Search keyword to filter gift coupons.',
    })
    keyword: string,

    @Args('status', {
      nullable: true,
      description: 'Filter gift coupons by status.',
    })
    status: string,

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
      description: 'Number of gift coupons per page.',
    })
    perPage: number,

    @Args('sortingField', {
      nullable: true,
      description: 'Field name used for sorting gift coupons.',
    })
    sorting_field: string,

    @Args('sortingOrder', {
      nullable: true,
      defaultValue: 'DESC',
      description: 'Sorting order: ASC or DESC.',
    })
    sorting_order: SortingOrder,
  ): Promise<GiftCouponListResponse> {
    try {
      const { result, total_count } =
        await this.ptSubscriptionService.adminGiftCouponList(
          keyword,
          status,
          page,
          perPage,
          sorting_field,
          sorting_order,
        );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        { list: result, total_count },
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
  @Roles(
    Role.PRIMARY_ADMIN,
    Role.ADMIN,
    Role.STANDARD_USER,
    Role.BASIC_USER,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Query(() => ValidateCouponByNameResponse, {
    name: 'validateCoupon',
    description: 'Validates a coupon by name for a business.',
  })
  async validateCoupon(
    @Args('coupon', {
      description: 'Coupon code to validate.',
    })
    coupon: string,

    @Args('company_id', {
      nullable: true,
      description: 'Business ID against which the coupon is validated.',
    })
    company_id: number,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the validateCoupon - client with arguments: keyword:: ${JSON.stringify({ coupon })}`,
      );

      const ptCoupon = await this.ptSubscriptionService.validateCoupon(
        coupon,
        company_id,
      );

      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        ptCoupon,
      );
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
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
  @Query(() => CompanyAppliedCouponListResponse, {
    name: 'companyAppliedCouponList',
    description: 'Lists all applied coupons for a business.',
  })
  async companyAppliedCouponList(
    @Args('keyword', {
      nullable: true,
      description: 'Search keyword to filter applied coupons.',
    })
    keyword: string,

    @Args('status', {
      nullable: true,
      description: 'Filter applied coupons by status.',
    })
    status: string,

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
      description: 'Number of applied coupons per page.',
    })
    perPage: number,

    @Args('sortingField', {
      nullable: true,
      description: 'Field name used for sorting applied coupons.',
    })
    sorting_field: string,

    @Args('sortingOrder', {
      nullable: true,
      defaultValue: 'DESC',
      description: 'Sorting order: ASC or DESC.',
    })
    sorting_order: SortingOrder,

    @Args('coupon_id', {
      type: () => Int,
      defaultValue: null,
      nullable: true,
      description: 'Filter applied coupons by coupon ID.',
    })
    coupon_id: number,

    @Args('company_id', {
      type: () => Int,
      defaultValue: null,
      nullable: true,
      description: 'Filter applied coupons by company ID.',
    })
    company_id: number,
  ) {
    try {
      const { result, total_count } =
        await this.ptSubscriptionService.companyAppliedCouponList(
          keyword,
          status,
          page,
          perPage,
          sorting_field,
          sorting_order,
          company_id,
          coupon_id,
        );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        { list: result, total_count },
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
}
