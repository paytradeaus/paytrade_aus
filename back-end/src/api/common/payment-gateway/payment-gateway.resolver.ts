import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { UseGuards } from '@nestjs/common';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { handleError } from '../error-handler';
import { PaymentGatewayService } from './payment-gateway.service';
import { CreateOrUpdateSubscriptionInput } from './dto/payment-gateway.input';
import { SubscriptionDetailsResponse } from './response/stripe-customer.response';
import {
  GetAllCardDetailsResponse,
  GetCardDetailsResponse,
} from './response/stripe-card-details.response';
import { GetPaymentHistoryInput } from './dto/get-payment-history.input';
import { GetPaymentHistoryResponse } from './response/get-payment-history.response';
import { GetSubscriptionDetailsResponse } from './response/get-subscription-details.response';
import { StringResponse, BooleanDataResponse } from 'src/api/users/signup/response/auth.response';
import { CreateActivityLogInput } from '../activity-log/dto/create-activity-log.input';
import { AuthService } from 'src/api/auth/auth-guard/auth.service';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Resolver()
export class PaymentGatewayResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly paymentGatewayService: PaymentGatewayService,
    private readonly activityLogService: ActivityLogService,
    private authService: AuthService,
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
  @Roles(
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Mutation(() => SubscriptionDetailsResponse, {
    name: 'upgradeSubscription',
    description:
      'Upgrade an existing company subscription plan based on the selected package and user role permissions.',
  })
  async upgradeSubscription(
    @Context() context,
    @Args('createOrUpdateSubscriptionInput', {
      description:
        'Payload containing subscription details and the selected package to upgrade for a company.',
    })
    createOrUpdateSubscriptionInput: CreateOrUpdateSubscriptionInput,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const isAdmin = ['RESTRICTED PORTAL ADMIN', 'PORTAL ADMIN']?.includes(
        decoded?.role,
      );
      const roles = await this.getCompanySpecificRole(
        decoded,
        createOrUpdateSubscriptionInput.company_id,
      );

      if (
        isAdmin ||
        (roles &&
          roles.role &&
          (roles.role === 'PRIMARY ADMIN' ||
            roles.role === 'ADMIN' ||
            (roles.role === 'STANDARD USER' &&
              roles.manageSubscription === 'Yes')))
      ) {
        const newSubscription =
          await this.paymentGatewayService.upgradeSubscription(
            createOrUpdateSubscriptionInput,
            decoded,
          );
        if (newSubscription) {
          if (!isAdmin) {
            const response = await this.authService.getAuthToken(
              decoded?.emailId,
              false,
            );

            newSubscription['token'] = response.data;
          }

          return framedResponse(
            'SUCCESS',
            `Your subscription has been successfully upgraded. Enjoy your enhanced benefits and features.`,
            newSubscription,
          );
        } else {
          throw new Error(
            `Something went wrong while upgrading your subscription. Please try again or contact administrator for assistance.`,
          );
        }
      }
      return framedResponse('ERROR', `Unauthorized to perform this action`);
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
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
  )
  @Mutation(() => SubscriptionDetailsResponse, {
    name: 'cancelSubscriptionForUser',
    description:
      'Cancel an active company subscription with an optional cancellation reason and return updated subscription details.',
  })
  async cancelSubscriptionForUser(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company whose subscription is to be cancelled.',
    })
    company_id: number,
    @Args('cancellation_reason', {
      description: 'Optional reason for cancelling the subscription.',
      nullable: true,
    })
    cancellation_reason?: string,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const roles = await this.getCompanySpecificRole(decoded, company_id);

      if (
        decoded?.role === 'PORTAL ADMIN' ||
        decoded?.role === 'RESTRICTED PORTAL ADMIN' ||
        (roles &&
          roles.role &&
          (roles.role === 'PRIMARY ADMIN' ||
            roles.role === 'ADMIN' ||
            (roles.role === 'STANDARD USER' &&
              roles.manageSubscription === 'Yes')))
      ) {
        const subscriptionDetails =
          await this.paymentGatewayService.cancelSubscriptionForUser(
            company_id,
            decoded,
            cancellation_reason,
          );
        if (subscriptionDetails) {
          if (!decoded?.isAdmin) {
            const response = await this.authService.getAuthToken(
              decoded?.emailId,
              false,
            );
            subscriptionDetails['token'] = response.data;
          }
          if (
            (subscriptionDetails.trial_end &&
              moment
                .unix(subscriptionDetails.trial_end)
                .isBefore(moment.tz('UTC'))) ||
            !subscriptionDetails.trial_end
          ) {
            return framedResponse(
              'SUCCESS',
              `${decoded?.isAdmin ? 'This' : 'Your'} subscription has been cancelled. ${decoded?.isAdmin ? 'It' : 'You'} will continue to have access to the service until the end of the current billing period. No refunds will be issued for the remaining time on the plan.`,
              subscriptionDetails,
            );
          } else {
            return framedResponse(
              'SUCCESS',
              `${decoded?.isAdmin ? 'This' : 'Your'} subscription has been cancelled.`,
              subscriptionDetails,
            );
          }
        } else {
          throw new Error(
            `Something went wrong while cancelling your subscription. Please try again or contact administrator for assistance.`,
          );
        }
      }
      return framedResponse('ERROR', `Unauthorized to perform this action`);
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
  @Roles(Role.PORTAL_ADMIN, Role.RESTRICTED_PORTAL_ADMIN)
  @Mutation(() => SubscriptionDetailsResponse, {
    name: 'subscriptionUpdateByAdmin',
    description:
      'Allow a portal administrator to update or refresh a company subscription manually.',
  })
  async subscriptionUpdateByAdmin(
    @Context() context,
    @Args('company_id', {
      description:
        'ID of the company whose subscription should be updated by admin.',
    })
    company_id: number,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const subscriptionDetails =
        await this.paymentGatewayService.subscriptionUpdateByAdmin(
          company_id,
          decoded,
        );
      if (subscriptionDetails) {
        return framedResponse(
          'SUCCESS',
          `Subscription has been updated.`,
          subscriptionDetails,
        );
      } else {
        throw new Error(`Failed to update subscription.`);
      }
    } catch (error) {
      this.logger.error(`Errored inside the client with message: ${error}`);
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => GetAllCardDetailsResponse, {
    name: 'getAllCardDetailsByCompanyId',
    description:
      'Retrieve all saved payment methods and card details for a specific company.',
  })
  async getAllCardDetailsByCompanyId(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company to fetch all card details for.',
    })
    company_id: number,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const roles = await this.getCompanySpecificRole(decoded, company_id);

      if (
        roles &&
        roles.role &&
        (roles.role === 'PRIMARY ADMIN' ||
          roles.role === 'ADMIN' ||
          (roles.role === 'STANDARD USER' &&
            roles.manageSubscription === 'Yes'))
      ) {
        const cardDetails =
          await this.paymentGatewayService.getAllCardDetailsByCompanyId(
            company_id,
          );
        return framedResponse(
          'SUCCESS',
          `Fetched the list of all card details successfully`,
          cardDetails,
        );
      }
      return framedResponse('ERROR', `Unauthorized to perform this action`);
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
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => GetCardDetailsResponse, {
    name: 'getCardDetailsByCompanyId',
    description:
      'Fetch the default or active payment card details associated with a company subscription.',
  })
  async getCardDetailsByCompanyId(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company to fetch default card details for.',
    })
    company_id: number,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const roles = await this.getCompanySpecificRole(decoded, company_id);

      if (
        roles &&
        roles.role &&
        (roles.role === 'PRIMARY ADMIN' ||
          roles.role === 'ADMIN' ||
          (roles.role === 'STANDARD USER' &&
            roles.manageSubscription === 'Yes'))
      ) {
        const cardDetails =
          await this.paymentGatewayService.getCardDetailsByCompanyId(
            company_id,
          );
        return framedResponse(
          'SUCCESS',
          `Fetched the card details successfully`,
          cardDetails,
        );
      }
      return framedResponse('ERROR', `Unauthorized to perform this action`);
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
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'setAsDefaultByPaymentMethodId',
    description:
      'Set a selected payment method as the default card for future subscription charges.',
  })
  async setAsDefaultByPaymentMethodId(
    @Context() context,
    @Args('customer_id', {
      description: 'Customer ID associated with the subscription.',
    })
    customer_id: string,
    @Args('payment_method_id', {
      description: 'Payment method ID to set as default.',
    })
    payment_method_id: string,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const company_id = (
        await this.paymentGatewayService.getSubscriptionDetailsByCustomerId(
          customer_id,
        )
      ).company_id;
      const roles = await this.getCompanySpecificRole(decoded, company_id);

      if (
        roles &&
        roles.role &&
        (roles.role === 'PRIMARY ADMIN' ||
          roles.role === 'ADMIN' ||
          (roles.role === 'STANDARD USER' &&
            roles.manageSubscription === 'Yes'))
      ) {
        const cardDetails =
          await this.paymentGatewayService.setAsDefaultByPaymentMethodId(
            customer_id,
            payment_method_id,
          );
        return framedResponse(
          'SUCCESS',
          `Your card has been set as default.`,
          cardDetails,
        );
      }
      return framedResponse('ERROR', `Unauthorized to perform this action`);
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
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'associatePaymentMethodToCustomer',
    description: `Attach a payment method to a company's billing profile for subscription payments.`,
  })
  async associatePaymentMethodToCustomer(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company to associate the payment method with.',
    })
    company_id: number,
    @Args('payment_method_id', {
      description: 'Payment method ID to associate.',
    })
    payment_method_id: string,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const roles = await this.getCompanySpecificRole(decoded, company_id);

      if (
        roles &&
        roles.role &&
        (roles.role === 'PRIMARY ADMIN' ||
          roles.role === 'ADMIN' ||
          (roles.role === 'STANDARD USER' &&
            roles.manageSubscription === 'Yes'))
      ) {
        const cardDetails =
          await this.paymentGatewayService.associatePaymentMethodToCustomer(
            company_id,
            payment_method_id,
          );
        return framedResponse(
          'SUCCESS',
          `Your card has been associated.`,
          cardDetails,
        );
      }
      return framedResponse('ERROR', `Unauthorized to perform this action`);
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
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => SubscriptionDetailsResponse, {
    name: 'updatePaymentMethodForSubscription',
    description: 'Update the payment method linked to an active subscription.',
  })
  async updatePaymentMethodForSubscription(
    @Context() context,
    @Args('subscription_id', {
      description: 'ID of the subscription to update.',
    })
    subscription_id: number,
    @Args('payment_method_id', {
      description: 'New payment method ID to associate with the subscription.',
    })
    payment_method_id: string,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const company_id = (
        await this.paymentGatewayService.getSubscriptionDetailsBySubscriptionId(
          subscription_id,
        )
      ).company_id;
      const roles = await this.getCompanySpecificRole(decoded, company_id);

      if (
        roles &&
        roles.role &&
        (roles.role === 'PRIMARY ADMIN' ||
          roles.role === 'ADMIN' ||
          (roles.role === 'STANDARD USER' &&
            roles.manageSubscription === 'Yes'))
      ) {
        const cardDetails =
          await this.paymentGatewayService.updatePaymentMethodForSubscription(
            decoded,
            subscription_id,
            payment_method_id,
          );
        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: 35,
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
          company_id: cardDetails?.company_id,
          is_admin: false,
          created_by: decoded?.userId,
        };
        await this.activityLogService.insertActivityLog(createActivityLogInput);
        return framedResponse(
          'SUCCESS',
          `Payment method has been updated for your subscription.`,
          cardDetails,
        );
      }
      return framedResponse('ERROR', `Unauthorized to perform this action`);
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
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'deleteCardByPaymentMethodId',
    description:
      'Remove a payment method permanently from the company billing profile.',
  })
  async deleteCardByPaymentMethodId(
    @Context() context,
    @Args('payment_method_id', {
      description: 'Payment method ID to be deleted.',
    })
    payment_method_id: string,
    @Args('company_id', {
      description: 'ID of the company whose card is being deleted.',
    })
    company_id: number,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const roles = await this.getCompanySpecificRole(decoded, company_id);

      if (
        decoded?.role === 'PORTAL ADMIN' ||
        decoded?.role === 'RESTRICTED PORTAL ADMIN' ||
        (roles &&
          roles.role &&
          (roles.role === 'PRIMARY ADMIN' ||
            roles.role === 'ADMIN' ||
            (roles.role === 'STANDARD USER' &&
              roles.manageSubscription === 'Yes')))
      ) {
        const cardDetails =
          await this.paymentGatewayService.deleteCardByPaymentMethodId(
            payment_method_id,
          );

        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: 36,
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
          company_id: company_id,
          is_admin: false,
          created_by: decoded?.userId,
        };
        await this.activityLogService.insertActivityLog(createActivityLogInput);

        return framedResponse(
          'SUCCESS',
          `Card has been deleted successfully`,
          cardDetails,
        );
      }
      return framedResponse('ERROR', `Unauthorized to perform this action`);
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
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
    Role.BASIC_USER,
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
  )
  @Query(() => GetPaymentHistoryResponse, {
    name: 'getPaymentHistoryByCompanyId',
    description:
      'Retrieve historical invoices and payment transactions for a specific company.',
  })
  async getPaymentHistoryByCompanyId(
    @Context() context,
    @Args('getPaymentHistoryInput', {
      description:
        'Payload containing company ID and filters to retrieve historical invoices and payment transactions.',
    })
    getPaymentHistoryInput: GetPaymentHistoryInput,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const timezone = decoded?.timezone || 'UTC';

      let roles;
      if (getPaymentHistoryInput.company_id) {
        roles = await this.getCompanySpecificRole(
          decoded,
          getPaymentHistoryInput.company_id,
        );
      }

      if (
        decoded?.role === 'PORTAL ADMIN' ||
        decoded?.role === 'RESTRICTED PORTAL ADMIN' ||
        (roles &&
          roles.role &&
          (roles.role === 'PRIMARY ADMIN' ||
            roles.role === 'ADMIN' ||
            (roles.role === 'STANDARD USER' &&
              roles.manageSubscription === 'Yes')))
      ) {
        const paymentHistory =
          await this.paymentGatewayService.getPaymentHistoryByCompanyId(
            getPaymentHistoryInput,
            timezone,
          );
        return framedResponse(
          'SUCCESS',
          `Fetched the payment history successfully`,
          paymentHistory,
        );
      }
      return framedResponse('ERROR', `Unauthorized to perform this action`);
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
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
    Role.BASIC_USER,
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
  )
  @Query(() => GetSubscriptionDetailsResponse, {
    name: 'getSubscriptionDetailsByCompanyId',
    description:
      'Fetch the current subscription plan and billing information for a company.',
  })
  async getSubscriptionDetailsByCompanyId(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company to fetch subscription details for.',
    })
    company_id: number,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const roles = await this.getCompanySpecificRole(decoded, company_id);

      if (
        decoded?.role === 'PORTAL ADMIN' ||
        decoded?.role === 'RESTRICTED PORTAL ADMIN' ||
        (roles &&
          roles.role &&
          (roles.role === 'PRIMARY ADMIN' ||
            roles.role === 'ADMIN' ||
            (roles.role === 'STANDARD USER' &&
              roles.manageSubscription === 'Yes') ||
            (roles.role === 'STANDARD USER' &&
              roles.manageSubscription === 'View Only')))
      ) {
        const subscriptionDetails =
          await this.paymentGatewayService.getSubscriptionDetailsByCompanyId(
            company_id,
          );
        return framedResponse(
          'SUCCESS',
          `Fetched the subscription details successfully`,
          subscriptionDetails,
        );
      }
      return framedResponse('ERROR', `Unauthorized to perform this action`);
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
    Role.STANDARD_USER,
    Role.PRIMARY_ADMIN,
    Role.ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Query(() => BooleanDataResponse, {
    name: 'getCompanyDemoStatus',
    description: 'Check if a company is in demo/sandbox mode.',
  })
  async getCompanyDemoStatus(
    @Context() context,
    @Args('company_id', { description: 'ID of the company to check.' })
    company_id: number,
  ): Promise<any> {
    try {
      await this.jwtInternalService.decodeJwtToken(context);
      const isDemo = await this.paymentGatewayService.checkCompanyDemoStatus(company_id);
      return framedResponse('SUCCESS', 'Fetched demo status', isDemo);
    } catch (error) {
      this.logError(`Error fetching demo status: ${error.message}`);
      return framedResponse('ERROR', 'Failed to fetch demo status');
    }
  }

  private getCompanySpecificRole(decoded, company_id): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        if (
          decoded?.companySpecificRoles &&
          decoded?.companySpecificRoles.length > 0 &&
          decoded?.companySpecificRoles[0] !== null
        ) {
          const roles = decoded?.companySpecificRoles.filter((item) => {
            return item.companyId === company_id;
          });
          this.logger.log(
            `Response received with roles: ${JSON.stringify(roles)}`,
          );
          if (roles && roles.length > 0 && roles[0] !== null) {
            resolve(roles[0]);
          }
          resolve('');
        }
        resolve('');
      } catch (error) {
        this.logger.error(
          `Errored while getting company specific role with message: ${error.message}`,
        );
      }
    });
  }
}
