import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SubscriptionItems } from 'src/entities/subscription-items.entity';
import { SubscriptionPlanItems } from 'src/entities/subscription-plan-items.entity';
import {
  EntityManager,
  ILike,
  In,
  LessThanOrEqual,
  Not,
  Repository,
} from 'typeorm';
import { AddSubscriptionItemInput } from './dto/add-subscription-item.dto';
import { UpdateSubscriptionItemInput } from './dto/update-subsciption-item.dto';
import {
  AddSubscriptionPlanInput,
  GetAllSubscribedUsersInput,
  GetAllSubscriptionPlanInput,
} from './dto/add-subscription-plan.dto';
import { UpdateSubscriptionPlanInput } from './dto/update-subscription-plan.dto';
import { PtSubscriptionItem } from './response/subscription-item.response';
import { SubscriptionPlanDetails } from 'src/entities/subscription-plan-details.entity';
import { SubscriptionPricingPlan } from 'src/entities/subscription-pricing-plan.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { handleError } from 'src/api/common/error-handler';
import { formatCurrency } from 'src/libs/@currency-formattor/currency-formattor';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { GetSubscriptionPlansResponse } from 'src/api/common/payment-gateway/response/stripe-plans-synced.response';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { PaymentGatewayService } from 'src/api/common/payment-gateway/payment-gateway.service';
import { EmailService } from 'src/libs/@email-services/email.service';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { SortingOrder } from '../pt-admin/dto/add-admin.dto';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { EmailTypeEnum } from 'src/entities/email-logs.entity';
import { GiftSubscriptionInput } from './dto/gift-subscription.dto';
import { CreateSubscriptionInput } from 'src/api/users/signup/dto/create-subscription.input';
import Stripe from 'stripe';
import {
  StripeCouponDurationType,
  StripeCoupons,
} from 'src/entities/subscription-coupon.entity';
import { AddGiftCouponInput } from './dto/add-stripe-coupon.dto';
import { UpdateStripeCouponInput } from './dto/update-stripe-coupon';
import { CompanyCouponDetails } from 'src/entities/company-coupon-details.entity';
import { IntegrationDetails } from 'src/entities/integration-details.entity';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');
var errorMessage = '';

@Injectable()
export class PtSubscriptionService {
  private logger: PaytradeLogger;
  private stripe: Stripe;

  constructor(
    @InjectRepository(SubscriptionItems)
    private subscriptionItems: Repository<SubscriptionItems>,
    @InjectRepository(SubscriptionPlanItems)
    private subscriptionPlanItems: Repository<SubscriptionPlanItems>,
    @InjectRepository(SubscriptionPlanDetails)
    private subscriptionPlanDetails: Repository<SubscriptionPlanDetails>,
    @InjectRepository(SubscriptionPricingPlan)
    private subscriptionPricingPlan: Repository<SubscriptionPricingPlan>,
    @InjectRepository(SubscriptionDetails)
    private subscriptionDetails: Repository<SubscriptionDetails>,
    private readonly paymentGatewayService: PaymentGatewayService,
    @InjectRepository(EmailTemplates)
    private emailTemplates: Repository<EmailTemplates>,
    @InjectRepository(StripeCoupons)
    private stripeCoupons: Repository<StripeCoupons>,
    @InjectRepository(CompanyCouponDetails)
    private companyCouponDetails: Repository<CompanyCouponDetails>,
    private emailServices: EmailService,
    private entityManager: EntityManager,
    private emailQueueProducer: EmailQueueProducer,
  ) {
    this.logger = new PaytradeLogger('ADMIN_SUBSCRIPTION_SERVICE');
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async checkSubscriptionItemNameExistence(item_name: string): Promise<any> {
    return await this.subscriptionItems.findOne({
      where: { item_name: item_name, item_status: Not('Deleted') },
    });
  }

  async insertSubscriptionItem(
    decoded,
    addSubscriptionItemInput: AddSubscriptionItemInput,
  ) {
    this.logger.log(
      `Admin add subscription item initiated with payload: ${JSON.stringify(addSubscriptionItemInput)}`,
    );
    addSubscriptionItemInput.created_by = decoded?.userId;
    addSubscriptionItemInput.created_on = moment.tz('UTC');
    addSubscriptionItemInput.created_group = 'ADMIN';
    const subItem = this.subscriptionItems.create(addSubscriptionItemInput);
    return await this.subscriptionItems.save(subItem);
  }

  async updateSubscriptionItem(
    decoded,
    updateSubscriptionItemInput: UpdateSubscriptionItemInput,
  ) {
    this.logger.log(
      `Admin update subscription item initiated with payload: ${JSON.stringify(updateSubscriptionItemInput)}`,
    );
    const subscriptionItem = await this.subscriptionItems.findOne({
      where: { id: updateSubscriptionItemInput.id },
    });
    if (!subscriptionItem) {
      throw new Error(`Content data does not exist.`);
    }
    subscriptionItem.item_name = updateSubscriptionItemInput.item_name;
    subscriptionItem.description = updateSubscriptionItemInput.description;
    subscriptionItem.item_status = updateSubscriptionItemInput.item_status;
    subscriptionItem.limit_type = updateSubscriptionItemInput.limit_type;
    subscriptionItem.dropdown_type = updateSubscriptionItemInput.dropdown_type;
    subscriptionItem.unit_type = updateSubscriptionItemInput.unit_type;
    subscriptionItem.updated_by = decoded?.userId;
    subscriptionItem.updated_on = moment.tz('UTC');
    subscriptionItem.updated_group = 'ADMIN';
    return await this.subscriptionItems.save(subscriptionItem);
  }

  async getSubsciptionItemById(id: string) {
    const result = await this.subscriptionItems.findOne({
      where: { id: id },
    });
    if (!result) {
      // Handle the case where no data is found for the given id
      throw new Error(`Subscription Item with id ${id} not found`);
    }

    return result;
  }

  async adminlistSubscriptionItems(
    keyword: string,
    status: string,
    page: number,
    perPage: number,
    sorting_field: string,
    sorting_order: SortingOrder | 'DESC',
  ): Promise<any> {
    const queryBuilder = this.subscriptionItems.createQueryBuilder('subitems');

    if (status) {
      queryBuilder.andWhere('subitems.item_status = :itemStatus', {
        itemStatus: status,
      });
    } else {
      queryBuilder.andWhere('subitems.item_status != :status', {
        status: 'Deleted',
      });
    }
    if (keyword) {
      queryBuilder.andWhere(`(LOWER(subitems.item_name) LIKE :keyword)`, {
        keyword: `%${keyword.toLowerCase()}%`,
      });
    }

    if (!sorting_field) {
      queryBuilder.orderBy({ 'subitems.created_on': 'DESC' });
    }
    if (sorting_field) {
      switch (sorting_field) {
        case 'item_name':
          {
            queryBuilder.orderBy({
              'LOWER(subitems.item_name)': sorting_order,
            });
          }
          break;
        case 'description':
          {
            queryBuilder.orderBy({
              'LOWER(subitems.description)': sorting_order,
            });
          }
          break;
        case 'item_status':
          {
            queryBuilder.orderBy({
              'LOWER(CAST(subitems.item_status AS text))': sorting_order,
            });
          }
          break;
      }
    }

    const [allSubscriptionItems, totalCount] = await Promise.all([
      queryBuilder.getMany(),
      queryBuilder.getCount(),
    ]);

    const page_number = page;
    const items_per_page = perPage;

    const startIndex =
      page_number && items_per_page ? (page_number - 1) * items_per_page : 0;
    const endIndex =
      page_number && items_per_page
        ? Math.min(
            (page_number - 1) * items_per_page + items_per_page,
            totalCount,
          )
        : totalCount;
    // Slice the results array to get the results for the current page
    const subscriptionItems = allSubscriptionItems?.slice(startIndex, endIndex);
    return { subscriptionItems, totalCount };
  }

  async checkSubscriptionPlanExistence(keyword) {
    return await this.subscriptionPlanDetails
      .createQueryBuilder('s')
      .select('s.id', 'id')
      .addSelect('s.plan_id', 'plan_id')
      .addSelect('s.stripe_product_id', 'stripe_product_id')
      .addSelect('s.plan_name', 'plan_name')
      .addSelect('s.description', 'description')
      .addSelect('s.plan_type', 'plan_type')
      .addSelect('s.plan_status', 'plan_status')
      .where('LOWER(s.plan_name) LIKE LOWER(:keyword)', {
        keyword: `${keyword.toLowerCase()}`,
      })
      .andWhere(`s.plan_status = 'Active'`)
      .getRawMany();
  }

  async adminAddSubscriptionAndPricing(
    data: AddSubscriptionPlanInput,
    decoded,
  ) {
    try {
      return await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          this.logger.log(
            `Request received for adding subscription plan with details: ${JSON.stringify(data)}`,
          );

          if (data.plan_type === 'Free') {
            const existingFreePlan = await transactionalEntityManager.findOne(
              SubscriptionPlanDetails,
              { where: { plan_type: 'Free', plan_status: 'Active' } },
            );
            if (
              existingFreePlan &&
              existingFreePlan.plan_id &&
              existingFreePlan.plan_type === 'Free'
            )
              throw `You already have an active Free plan. Please deactivate the existing plan before adding a new one.`;
          }

          let productData = {
            trial_period: data.trial_period ?? 0,
            created_by: decoded?.userId,
            created_on: moment.tz('UTC'),
            created_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
          } as any;
          if (data.plan_type === 'Paid') {
            const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
              apiVersion: '2024-06-20',
            });
            let productObj: any = {
              name: data.plan_name,
            };
            if (data.description) {
              productObj = {
                ...productObj,
                description: data.description,
              };
            }
            const productDetails = await stripe.products.create(productObj);
            if (productDetails.active) {
              productData = {
                ...productData,
                stripe_product_id: productDetails.id,
                plan_name: productDetails.name,
                description: productDetails.description,
                plan_type: data.plan_type,
                plan_status: data.plan_status,
              };
            } else {
              throw `Error thrown while creating product using stripe ${productDetails}.`;
            }
          } else {
            productData = {
              ...productData,
              plan_name: data.plan_name,
              description: data.description,
              plan_type: data.plan_type,
              plan_status: data.plan_status,
            };
          }

          const subscriptionPlanDetail = await transactionalEntityManager.save(
            this.subscriptionPlanDetails.create(productData),
          );
          const subsciptionPlan = Array.isArray(subscriptionPlanDetail)
            ? subscriptionPlanDetail[0]
            : subscriptionPlanDetail;
          // Assign the plan_id
          subsciptionPlan.plan_id = 100000 + Number(subsciptionPlan.plan_id);
          let associated_price_ids = [];
          if (subsciptionPlan) {
            let priceData = [];
            if (
              data.plan_type === 'Paid' &&
              productData &&
              productData.stripe_product_id
            ) {
              const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
                apiVersion: '2024-06-20',
              });
              if (data.monthly_price > 0) {
                const plan = await stripe.prices.create({
                  product: productData.stripe_product_id,
                  nickname: `${data.plan_name} - Monthly Plan`,
                  unit_amount: Number(data.monthly_price) * 100, // Amount in cents
                  currency: 'aud',
                  recurring: { interval: 'month' },
                });
                if (plan.active) {
                  priceData.push({
                    stripe_price_id: plan.id,
                    plan_id: subsciptionPlan.plan_id,
                    price_name: plan.nickname,
                    bill_cycle: 'Month',
                    plan_price: data.monthly_price,
                    is_active: plan.active,
                    created_by: decoded?.userId,
                    created_on: moment.tz('UTC'),
                    created_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
                  });
                } else {
                  throw `Error thrown while creating price using stripe ${plan}.`;
                }
              }
              if (data.yearly_price > 0) {
                const plan = await stripe.prices.create({
                  product: productData.stripe_product_id,
                  nickname: `${data.plan_name} - Yearly Plan`,
                  unit_amount: Number(data.yearly_price) * 100, // Amount in cents
                  currency: 'aud',
                  recurring: { interval: 'year' },
                });
                if (plan.active) {
                  priceData.push({
                    stripe_price_id: plan.id,
                    plan_id: subsciptionPlan.plan_id,
                    price_name: plan.nickname,
                    bill_cycle: 'Year',
                    plan_price: data.yearly_price,
                    is_active: plan.active,
                    created_by: decoded?.userId,
                    created_on: moment.tz('UTC'),
                    created_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
                  });
                } else {
                  throw `Error thrown while creating price using stripe ${plan}.`;
                }
              }
            } else {
              priceData.push({
                plan_id: subsciptionPlan.plan_id,
                price_name: `${data.plan_name} - Plan`,
                is_active: data.plan_status === 'Active' ? true : false,
                created_by: decoded?.userId,
                created_on: moment.tz('UTC'),
                created_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
              });
            }
            if (priceData && priceData.length > 0) {
              const subscriptionPricingPlan =
                await transactionalEntityManager.save(
                  this.subscriptionPricingPlan.create(priceData),
                );

              for (const element of subscriptionPricingPlan) {
                element.price_id = 100000 + Number(element.price_id);
                await transactionalEntityManager.save(element);
                associated_price_ids.push(element.id);
              }

              if (data.itemIds) {
                const items = await Promise.all(
                  data.itemIds.map((itemId) =>
                    transactionalEntityManager.findOne(SubscriptionItems, {
                      where: { id: itemId },
                    }),
                  ),
                );
                const planItems = items.map((item, index) => {
                  const planItem = new SubscriptionPlanItems();
                  planItem.plan_id = subsciptionPlan.plan_id;
                  planItem.item_id = item.subscription_item_id;

                  const spec = data.item_specification?.find(
                    (s) => s.item_id === data.itemIds[index],
                  );

                  planItem.limit_value = spec?.limit_value ?? null;
                  planItem.is_unlimited = spec?.is_unlimited ?? false;
                  return planItem;
                });
                await transactionalEntityManager.save(planItems);
              }
              subsciptionPlan.associated_price_ids = associated_price_ids;
              return await transactionalEntityManager.save(subsciptionPlan);
            }
            throw `Errored while adding price details.`;
          }
          throw `Errored while creating subscription plan.`;
        },
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
      this.logger.log(
        `Admin add subscription and pricing failed with message: ${JSON.stringify(error)}`,
      );
      throw errMsg;
    }
  }

  async adminUpdateSubscriptionAndPricing(
    data: UpdateSubscriptionPlanInput,
    decoded,
  ) {
    try {
      return await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          // Log the start of the transaction
          this.logger.log(
            `Admin updating subscription plan with details: ${JSON.stringify(data)}`,
          );

          // Fetch the subscription plan details early in the transaction
          const subscriptionPlanDetails =
            await transactionalEntityManager.findOne(SubscriptionPlanDetails, {
              where: { id: data.id },
              relations: ['pricingPlan', 'planItem'],
            });

          if (!subscriptionPlanDetails) {
            throw new Error(`Subscription data does not exist`);
          }

          if (subscriptionPlanDetails.plan_status !== 'Active') {
            throw new Error(`This Subscription Plan cannot be edited.`);
          }

          let productData = {
            trial_period: data.trial_period ?? 0,
            updated_by: decoded?.userId,
            updated_on: moment.tz('UTC'),
            updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
          } as any;

          if (
            subscriptionPlanDetails.plan_type === 'Paid' &&
            data.description
          ) {
            const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
              apiVersion: '2024-06-20',
            });

            const productDetails = await stripe.products.update(
              subscriptionPlanDetails.stripe_product_id,
              {
                description: data.description,
              },
            );

            if (!productDetails.active) {
              throw new Error(
                `Error thrown while updating product using Stripe ${productDetails}.`,
              );
            }

            productData = {
              ...productData,
              description: productDetails.description,
              plan_status: data.plan_status,
            };
          } else {
            productData = {
              ...productData,
              description: data.description,
              plan_status: data.plan_status,
            };
          }

          // Update subscription plan details
          const subscriptionPlanDetail = await transactionalEntityManager
            .createQueryBuilder()
            .update(SubscriptionPlanDetails)
            .set({
              description: productData.description,
              plan_status: productData.plan_status,
              trial_period: productData.trial_period,
              updated_by: productData.updated_by,
              updated_on: productData.updated_on,
              updated_group: productData.updated_group,
            })
            .where(`id = :id`, { id: data.id })
            .execute();

          if (!subscriptionPlanDetail?.affected) {
            throw new Error(`Failed to update subscription plan.`);
          }

          if (
            subscriptionPlanDetails &&
            subscriptionPlanDetails.plan_type === 'Paid' &&
            subscriptionPlanDetails.stripe_product_id
          ) {
            if (
              Number(subscriptionPlanDetails.trial_period) !==
              Number(productData.trial_period)
            ) {
              const handleExistingSubscriptions =
                await this.handleExistingSubscriptions(
                  data,
                  subscriptionPlanDetails,
                  productData,
                  transactionalEntityManager,
                  decoded,
                );
            }

            const handlePricing = await this.handlePricing(
              data,
              subscriptionPlanDetails,
              productData,
              transactionalEntityManager,
              decoded,
            );
          }

          const handlePlanItems = await this.handlePlanItems(
            data,
            subscriptionPlanDetails,
            transactionalEntityManager,
          );

          const checkSubscriptionExpiryAndUpdateXero =
            await this.checkSubscriptionExpiryAndUpdateXero(
              subscriptionPlanDetails?.plan_id,
              transactionalEntityManager,
            );

          return await transactionalEntityManager.findOne(
            SubscriptionPlanDetails,
            {
              where: { id: data.id },
            },
          );
        },
      );
    } catch (error) {
      const errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Admin update subscription and pricing failed with message: ${errorMessage}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        return error;
      });
      throw errMsg;
    }
  }

  async adminArchiveSubscriptionAndPricing(
    id: string,
    decoded: any,
    is_archived: boolean,
  ) {
    try {
      return await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          this.logger.log(
            `Request received for adding subscription plan with details: ${id}`,
          );

          // Fetch the subscription plan details early in the transaction
          const subscriptionPlanDetails =
            await transactionalEntityManager.findOne(SubscriptionPlanDetails, {
              where: { id },
              relations: ['pricingPlan', 'planItem'],
            });

          if (!subscriptionPlanDetails) {
            throw new Error(`Subscription data does not exist`);
          }

          if (subscriptionPlanDetails.plan_type === 'Free') {
            if (is_archived) {
              throw new Error(`Free Plan cannot be archived.`);
            } else {
              throw new Error(`Free Plan cannot be unarchived.`);
            }
          }

          if (is_archived && subscriptionPlanDetails.plan_status !== 'Active') {
            throw new Error(`Only Active Plans can be archived.`);
          }

          if (
            !is_archived &&
            subscriptionPlanDetails.plan_status !== 'Inactive'
          ) {
            throw new Error(`Only Inactive Plans can be unarchived.`);
          }

          // const subscribedUsers = await transactionalEntityManager.find(
          //   SubscriptionDetails,
          //   {
          //     where: {
          //       plan_id: subscriptionPlanDetails.plan_id,
          //       status: In(['Subscribed', 'Under Trial', 'Past Due']),
          //     },
          //   },
          // );

          // if (subscribedUsers && subscribedUsers.length > 0 && subscribedUsers[0] !== null)
          //   throw new Error(`This plan cannot be archived as there are active subscribers currently using it.`);

          let productData = {
            updated_by: decoded?.userId,
            updated_on: moment.tz('UTC'),
            updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
          } as any;
          if (subscriptionPlanDetails.plan_type === 'Paid') {
            const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
              apiVersion: '2024-06-20',
            });
            const productDetails = await stripe.products.update(
              subscriptionPlanDetails.stripe_product_id,
              {
                active: is_archived ? false : true,
              },
            );

            productData = {
              ...productData,
              plan_status: productDetails.active ? 'Active' : 'Inactive',
            };
          } else {
            productData = {
              ...productData,
              plan_status: is_archived ? 'Inactive' : 'Active',
            };
          }

          // Update subscription plan details
          const subscriptionPlanDetail = await transactionalEntityManager
            .createQueryBuilder()
            .update(SubscriptionPlanDetails)
            .set({
              plan_status: productData.plan_status,
              updated_by: productData.updated_by,
              updated_on: productData.updated_on,
              updated_group: productData.updated_group,
            })
            .where(`id = :id`, { id })
            .execute();

          if (!subscriptionPlanDetail?.affected) {
            throw new Error(
              `Failed to ${is_archived ? 'archive' : 'unarchive'} subscription plan.`,
            );
          }
          if (
            subscriptionPlanDetails &&
            subscriptionPlanDetails.plan_type === 'Paid' &&
            subscriptionPlanDetails.stripe_product_id
          ) {
            const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
              apiVersion: '2024-06-20',
            });

            for (const element of subscriptionPlanDetails.pricingPlan) {
              if (
                // element.is_active &&
                subscriptionPlanDetails.associated_price_ids.includes(
                  element.id,
                )
              ) {
                const oldPlan = await stripe.prices.update(
                  element.stripe_price_id,
                  {
                    active: is_archived ? false : true,
                  },
                );

                await transactionalEntityManager
                  .createQueryBuilder()
                  .update(SubscriptionPricingPlan)
                  .set({
                    is_active: oldPlan.active,
                    updated_by: productData.updated_by,
                    updated_on: productData.updated_on,
                    updated_group: productData.updated_group,
                  })
                  .where(`id = :id`, { id: element.id })
                  .execute();
              }
            }
          }

          return await transactionalEntityManager.findOne(
            SubscriptionPlanDetails,
            {
              where: { id },
            },
          );
        },
      );
    } catch (error) {
      errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Admin archive subscription and pricing failed with message: ${errorMessage}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors
        return error;
      });
      throw errMsg;
    }
  }

  private async handleExistingSubscriptions(
    data: UpdateSubscriptionPlanInput,
    subscriptionPlanDetails: SubscriptionPlanDetails,
    productData: any,
    transactionalEntityManager: EntityManager,
    decoded: any,
  ) {
    const subscribedUsersUnderTrial = await transactionalEntityManager.find(
      SubscriptionDetails,
      {
        where: {
          plan_id: subscriptionPlanDetails.plan_id,
          status: 'Under Trial',
        },
        relations: ['companyDetails'],
      },
    );
    let updatedSubscriptionIds = [];
    if (
      subscribedUsersUnderTrial &&
      subscribedUsersUnderTrial.length > 0 &&
      subscribedUsersUnderTrial[0] !== null
    ) {
      for (const element of subscribedUsersUnderTrial) {
        const trialEndDate = moment(element.start_date)
          .add(productData.trial_period, 'months')
          .utc();

        if (moment(element.expiry_date) !== trialEndDate) {
          const updateExistingSubscriptions =
            await this.updateExistingSubscriptions(
              transactionalEntityManager,
              element,
              trialEndDate,
              productData,
              decoded,
            );
          updatedSubscriptionIds.push(updateExistingSubscriptions.id);
        }
      }
    }
    return updatedSubscriptionIds;
  }

  private async updateExistingSubscriptions(
    transactionalEntityManager: EntityManager,
    element,
    expiryDate,
    productData,
    decoded,
  ) {
    this.logger.log(`Update subscription intiated: ${JSON.stringify(element)}`);

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });

    const subscription = await stripe.subscriptions.update(
      element.stripe_subscription_id,
      {
        trial_end: productData.trial_period !== 0 ? expiryDate.unix() : 'now',
      },
    );
    let subscriptionStatus =
      await this.paymentGatewayService.getSubscriptionStatus(
        subscription.status,
      );
    const updateSubscriptionDetails = await transactionalEntityManager
      .createQueryBuilder()
      .update(SubscriptionDetails)
      .set({
        expiry_date: expiryDate.toDate(),
        status: subscriptionStatus,
        trial_start: subscription.trial_start
          ? moment.unix(subscription.trial_start).utc().toDate()
          : subscription.trial_start,
        trial_end: subscription.trial_end
          ? moment.unix(subscription.trial_end).utc().toDate()
          : subscription.trial_end,
        updated_by: decoded?.userId,
        updated_on: moment.tz('UTC'),
        updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
      })
      .where(`company_id = :company_id`, {
        company_id: element.company_id,
      })
      .execute();
    if (
      moment(element.expiry_date).isAfter(expiryDate) ||
      moment(element.expiry_date).isBefore(expiryDate)
    ) {
      const primaryAdminDetails = await transactionalEntityManager.findOne(
        CompanyUserRoles,
        {
          where: {
            company_id: element.company_id,
            company_role: Role.PRIMARY_ADMIN,
            status: 'Active',
          },
          relations: ['userDetails'],
        },
      );
      const mailTemplate = await this.getMailTemplateByMailType(
        'subscription-trial-period',
      );
      const toMaildetails = primaryAdminDetails.userDetails.email_id;
      //check need to be added for getting timezone
      const response = {
        new_trial_end_date: moment(element.expiry_date).format('DD/MM/YYYY'),
        original_trial_end_date: expiryDate.format('DD/MM/YYYY'),
        admin_name:
          primaryAdminDetails.userDetails.first_name +
          ' ' +
          primaryAdminDetails.userDetails.last_name,
      };
      const Keys = mailTemplate.selected_dynamic;
      const dynamicData: { [key: string]: any } = {};
      Keys.forEach((key) => {
        dynamicData[key] = response[key];
      });

      const mailbody = await this.replaceVariables(
        mailTemplate.email_content,
        dynamicData,
      );

      var mailDetails = {
        toEmail: toMaildetails,
        subject: mailTemplate.email_subject,
        template: 'header-footer-email',
        mailBody: mailbody,
        mail_type: EmailTypeEnum.subscriptionTrialPeriod,
      };

      this.emailQueueProducer.emailQueueProducer(mailDetails);
      // this.emailServices.sendMail(mailDetails);
      this.logger.log(`Email sent successfully with details: ${mailDetails}`);
    }
    return subscription;
  }

  private async handlePricing(
    data: UpdateSubscriptionPlanInput,
    subscriptionPlanDetails: SubscriptionPlanDetails,
    productData: any,
    transactionalEntityManager: EntityManager,
    decoded: any,
  ) {
    let associated_price_ids = [],
      inactive_prices = [];
    let priceData = [];
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });
    const pricingPlan: any = await transactionalEntityManager.find(
      SubscriptionPricingPlan,
      {
        where: {
          is_active: true,
          id: In(subscriptionPlanDetails.associated_price_ids),
        },
      },
    );

    let mprice, yprice, planid;
    if (pricingPlan && pricingPlan[0] !== null && pricingPlan.length == 1) {
      mprice =
        pricingPlan[0].bill_cycle === 'Month' ? pricingPlan[0].plan_price : 0;
      yprice =
        pricingPlan[0].bill_cycle === 'Year' ? pricingPlan[0].plan_price : 0;
      planid = pricingPlan[0].plan_id;
      if (mprice == 0) {
        pricingPlan.push({
          plan_id: planid,
          bill_cycle: 'Month',
          plan_price: mprice,
        });
      }
      if (yprice == 0) {
        pricingPlan.push({
          plan_id: planid,
          bill_cycle: 'Year',
          plan_price: yprice,
        });
      }
    }

    for (const element of pricingPlan) {
      if (
        element.bill_cycle === 'Month' &&
        Number(element.plan_price) !== Number(data.monthly_price)
      ) {
        if (element.stripe_price_id) {
          const oldPlan = await stripe.prices.update(element.stripe_price_id, {
            active: false,
          });

          await transactionalEntityManager
            .createQueryBuilder()
            .update(SubscriptionPricingPlan)
            .set({
              is_active: oldPlan.active,
              updated_by: productData.updated_by,
              updated_on: productData.updated_on,
              updated_group: productData.updated_group,
            })
            .where(`id = :id`, { id: element.id })
            .execute();

          inactive_prices.push({
            id: element.id,
            price_id: element.price_id,
            bill_cycle: element.bill_cycle,
          });
        }

        if (Number(data.monthly_price) > 0) {
          const plan = await stripe.prices.create({
            product: subscriptionPlanDetails.stripe_product_id,
            nickname: `${subscriptionPlanDetails.plan_name} - Monthly Plan`,
            unit_amount: Number(data.monthly_price) * 100, // Amount in cents
            currency: 'aud',
            recurring: { interval: 'month' },
          });

          if (plan.active) {
            priceData.push({
              stripe_price_id: plan.id,
              plan_id: element.plan_id,
              price_name: plan.nickname,
              bill_cycle: 'Month',
              plan_price: data.monthly_price,
              is_active: plan.active,
              created_by: decoded?.userId,
              created_on: moment.tz('UTC'),
              created_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
            });
          } else {
            throw new Error(
              `Error thrown while creating price using stripe ${plan}.`,
            );
          }
        }
      } else if (
        element.bill_cycle === 'Year' &&
        Number(element.plan_price) !== Number(data.yearly_price)
      ) {
        if (element.stripe_price_id) {
          const oldPlan = await stripe.prices.update(element.stripe_price_id, {
            active: false,
          });

          await transactionalEntityManager
            .createQueryBuilder()
            .update(SubscriptionPricingPlan)
            .set({
              is_active: oldPlan.active,
              updated_by: productData.updated_by,
              updated_on: productData.updated_on,
              updated_group: productData.updated_group,
            })
            .where(`id = :id`, { id: element.id })
            .execute();

          inactive_prices.push({
            id: element.id,
            price_id: element.price_id,
            bill_cycle: element.bill_cycle,
          });
        }
        if (Number(data.yearly_price) > 0) {
          const plan = await stripe.prices.create({
            product: subscriptionPlanDetails.stripe_product_id,
            nickname: `${subscriptionPlanDetails.plan_name} - Yearly Plan`,
            unit_amount: Number(data.yearly_price) * 100, // Amount in cents
            currency: 'aud',
            recurring: { interval: 'year' },
          });

          if (plan.active) {
            priceData.push({
              stripe_price_id: plan.id,
              plan_id: element.plan_id,
              price_name: plan.nickname,
              bill_cycle: 'Year',
              plan_price: data.yearly_price,
              is_active: plan.active,
              created_by: decoded?.userId,
              created_on: moment.tz('UTC'),
              created_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
            });
          } else {
            throw new Error(
              `Error thrown while creating price using stripe ${plan}.`,
            );
          }
        }
      }
    }
    if (priceData && priceData.length > 0 && priceData[0] !== null) {
      const subscriptionPricingPlan = await transactionalEntityManager.save(
        this.subscriptionPricingPlan.create(priceData),
      );
      for (const element of subscriptionPricingPlan) {
        element.price_id = 100000 + Number(element.price_id);
        await transactionalEntityManager.save(element);
        associated_price_ids.push(element.id);
      }

      let oldPriceIds = subscriptionPlanDetails.associated_price_ids;
      let inactiveIds = [];
      inactive_prices.forEach((element) => {
        inactiveIds.push(element.id);
      });
      oldPriceIds = oldPriceIds.filter((id) => !inactiveIds.includes(id));
      let newPriceIds = [...oldPriceIds, ...associated_price_ids];
      const updateAssociatedPriceIds = await transactionalEntityManager
        .createQueryBuilder()
        .update(SubscriptionPlanDetails)
        .set({
          associated_price_ids: newPriceIds,
          updated_by: productData.updated_by,
          updated_on: productData.updated_on,
          updated_group: productData.updated_group,
        })
        .where(`id = :id`, { id: data.id })
        .execute();

      const priceDetails = await transactionalEntityManager.find(
        SubscriptionPricingPlan,
        { where: { id: In(newPriceIds) }, relations: ['planDetails'] },
      );
      for (const element of inactive_prices) {
        const matchingActivePrice = priceDetails.find(
          (activePrice) => activePrice.bill_cycle === element.bill_cycle,
        );
        if (matchingActivePrice) {
          const subscribedUsers = await transactionalEntityManager.find(
            SubscriptionDetails,
            {
              where: {
                plan_id: subscriptionPlanDetails.plan_id,
                price_id: element.price_id,
                status: In(['Subscribed', 'Under Trial', 'Past Due']),
              },
              relations: ['companyDetails'],
            },
          );

          if (
            subscribedUsers &&
            subscribedUsers.length > 0 &&
            subscribedUsers[0] !== null
          ) {
            for (const element of subscribedUsers) {
              const primaryAdminDetails =
                await transactionalEntityManager.findOne(CompanyUserRoles, {
                  where: {
                    company_id: element.company_id,
                    company_role: Role.PRIMARY_ADMIN,
                    status: 'Active',
                  },
                  relations: ['userDetails'],
                });
              const oldSubscription = await stripe.subscriptions.retrieve(
                element.stripe_subscription_id,
              );

              const subscription = await stripe.subscriptions.update(
                element.stripe_subscription_id,
                {
                  items: [
                    {
                      id: oldSubscription.items.data[0].id,
                      price: matchingActivePrice.stripe_price_id,
                    },
                  ],
                  proration_behavior: 'create_prorations',
                },
              );
              const mailTemplate = await this.getMailTemplateByMailType(
                'subscription-plan-pricing',
              );
              const toMaildetails = primaryAdminDetails.userDetails.email_id;
              const response = {
                current_plan: matchingActivePrice.planDetails.plan_name,
                old_price: formatCurrency(element.amount),
                new_price: formatCurrency(matchingActivePrice.plan_price),
                admin_name:
                  primaryAdminDetails.userDetails.first_name +
                  ' ' +
                  primaryAdminDetails.userDetails.last_name,
              };
              const Keys = mailTemplate.selected_dynamic;
              const dynamicData: { [key: string]: any } = {};
              Keys.forEach((key) => {
                dynamicData[key] = response[key];
              });

              const mailbody = await this.replaceVariables(
                mailTemplate.email_content,
                dynamicData,
              );

              var mailDetails = {
                toEmail: toMaildetails,
                subject: mailTemplate.email_subject,
                template: 'header-footer-email',
                mailBody: mailbody,
                mail_type: EmailTypeEnum.subscriptionPlanPricing,
              };

              this.emailQueueProducer.emailQueueProducer(mailDetails);
              // this.emailServices.sendMail(mailDetails);
              this.logger.log(
                `Email sent successfully with details: ${mailDetails}`,
              );
            }
            await transactionalEntityManager
              .createQueryBuilder()
              .update(SubscriptionDetails)
              .set({
                price_id: matchingActivePrice.price_id,
                amount: matchingActivePrice.plan_price,
                updated_by: productData.updated_by,
                updated_on: productData.updated_on,
                updated_group: productData.updated_group,
              })
              .where(`price_id = :price_id`, { price_id: element.price_id })
              .andWhere(`plan_id = :plan_id`, {
                plan_id: subscriptionPlanDetails.plan_id,
              })
              .andWhere(`status IN ('Subscribed', 'Under Trial', 'Past Due')`)
              .execute();
          }
        }
      }
      return updateAssociatedPriceIds;
    }
  }

  private async handlePlanItems(
    data: UpdateSubscriptionPlanInput,
    subscriptionPlanDetails: SubscriptionPlanDetails,
    transactionalEntityManager: EntityManager,
  ) {
    this.logger.log(
      `Request to handle subscription plan items for : ${JSON.stringify(subscriptionPlanDetails)}`,
    );
    const existingItems = await transactionalEntityManager
      .createQueryBuilder(SubscriptionPlanItems, 'planItem')
      .select(['planItem.id AS id', 'item.id AS item_id', 'plan.id AS plan_id'])
      .leftJoin('planItem.item', 'item')
      .leftJoin('planItem.planDetails', 'plan')
      .where('plan.id = :planId', { planId: data.id })
      .andWhere('item.item_status = :itemStatus', { itemStatus: 'Active' })
      .getRawMany();

    let addedPlanItems = [];
    if (data.itemIds) {
      const selectedItems = await transactionalEntityManager
        .createQueryBuilder(SubscriptionItems, 'item')
        .select([
          'item.id AS id',
          'item.subscription_item_id AS subscription_item_id',
          'item.item_status AS item_status',
        ])
        .where('item.id IN (:...itemIds)', { itemIds: data.itemIds })
        .andWhere('item.item_status = :itemStatus', { itemStatus: 'Active' })
        .getRawMany();

      for (const item of selectedItems) {
        const itemExists = existingItems.some(
          (planItem) => planItem.item_id === item.id,
        );

        if (!itemExists) {
          // Add item to subscription plan
          const planItem = new SubscriptionPlanItems();
          planItem.plan_id = subscriptionPlanDetails.plan_id;
          planItem.item_id = item.subscription_item_id;

          const spec = data.item_specification?.find(
            (s) => s.item_id === item.id,
          );

          planItem.limit_value = spec?.limit_value ?? null;
          planItem.is_unlimited = spec?.is_unlimited ?? false;

          const newPlanItem = await transactionalEntityManager.save(planItem);
          addedPlanItems.push(newPlanItem);
        } else {
          const existingPlanItems = await transactionalEntityManager.findOne(
            SubscriptionPlanItems,
            {
              where: {
                plan_id: subscriptionPlanDetails.plan_id,
                item_id: item.subscription_item_id,
              },
            },
          );
          const spec = data.item_specification?.find(
            (s) => s.item_id === item.id,
          );

          existingPlanItems.limit_value = spec?.limit_value ?? null;
          existingPlanItems.is_unlimited = spec?.is_unlimited ?? false;

          const existingPlanItem =
            await transactionalEntityManager.save(existingPlanItems);
          addedPlanItems.push(existingPlanItem);
        }
      }

      const itemsToRemove = existingItems.filter(
        (existingItem) =>
          !selectedItems.some(
            (selectedItem) => selectedItem.id === existingItem.item_id,
          ),
      );

      for (const item of itemsToRemove) {
        const removeRecord = await transactionalEntityManager.findOne(
          SubscriptionPlanItems,
          { where: { id: item.id } },
        );
        await transactionalEntityManager.remove(
          SubscriptionPlanItems,
          removeRecord,
        );
      }
    }
    return addedPlanItems;
  }

  async checkSubscriptionExpiryAndUpdateXero(
    plan_id,
    transactionalEntityManager: EntityManager,
  ) {
    try {
      console.log('Expiry check starts');
      const subscriptionDetails = await transactionalEntityManager
        .createQueryBuilder(SubscriptionDetails, 'sd')
        .select('sd.id', 'id')
        .addSelect('sd.subscription_id', 'subscription_id')
        .addSelect('sd.company_id', 'company_id')
        .addSelect('sd.plan_id', 'plan_id')
        .addSelect('sd.price_id', 'price_id')
        .addSelect('sd.amount', 'amount')
        .addSelect('sd.start_date', 'start_date')
        .addSelect('sd.expiry_date', 'expiry_date')
        .addSelect('sd.status', 'status')
        .addSelect('pi.plan_items', 'plan_items')
        .addSelect('sd.is_free_plan_eligible', 'is_free_plan_eligible')
        .leftJoin('sd.planDetails', 'plan')
        .leftJoin(
          (qb) =>
            qb
              .select([
                'spi.plan_id as plan_id',
                `json_agg(
              json_build_object(
                  'id', spi.id,
                  'plan_item_id', spi.id,
                  'item_id', spi.item_id,
                  'item_name', si.item_name,
                  'item_status', si.item_status,
                  'limit_value', spi.limit_value,
                  'is_unlimited', spi.is_unlimited
              )
          ) as plan_items`,
              ])
              .from(SubscriptionPlanItems, 'spi')
              .innerJoin(
                SubscriptionItems,
                'si',
                `spi.item_id = si.subscription_item_id and si.item_status = 'Active' and si.item_name = 'Xero Integration'`,
              )
              .groupBy('spi.plan_id'),
          'pi',
          'sd.plan_id = pi.plan_id and plan.plan_id = pi.plan_id',
        )
        .where(
          `sd.plan_id = :plan_id and sd.status = 'Subscribed' and sd.is_free_plan_eligible = false`,
          {
            plan_id,
          },
        )
        .getRawMany();

      console.log({ subscriptionDetails });
      if (subscriptionDetails && subscriptionDetails?.length > 0) {
        let expiredSubscriptionDetails = [],
          activeSubscriptionDetails = [];
        for (const element of subscriptionDetails) {
          if (element?.plan_items && element?.plan_items?.length > 0) {
            if (element?.plan_items[0]?.limit_value == 'true') {
              activeSubscriptionDetails.push(element);
            } else {
              expiredSubscriptionDetails.push(element);
            }
          }
        }
        console.log({ expiredSubscriptionDetails });
        if (
          expiredSubscriptionDetails &&
          expiredSubscriptionDetails?.length > 0
        ) {
          const expiredCompanyIds = [
            ...new Set(expiredSubscriptionDetails.map((r) => r.company_id)),
          ];

          console.log({ expiredCompanyIds });
          const expireIntegrations = await transactionalEntityManager.find(
            IntegrationDetails,
            {
              where: {
                company_id: In(expiredCompanyIds),
                integration_status: Not(In(['Inactive', 'Deleted - archived'])),
              },
              order: { company_id: 'DESC' },
            },
          );

          console.log({ expireIntegrations });
          if (expireIntegrations && expireIntegrations?.length > 0) {
            const expiredIntegrationIds = [
              ...new Set(expireIntegrations.map((r) => r.integration_id)),
            ];

            console.log({ expiredIntegrationIds });
            const updateIntegrationResult = await transactionalEntityManager
              .createQueryBuilder()
              .update(IntegrationDetails)
              .set({
                previous_status: () =>
                  `(integration_status)::text::integration_details_previous_status_enum`,
                integration_status: 'Inactive',
                updated_on: moment.tz('UTC'),
                updated_group: 'SYSTEM',
              })
              .where(`integration_id IN (:...integration_id)`, {
                integration_id: expiredIntegrationIds,
              })
              .execute();

            console.log({ updateIntegrationResult });
            console.log('Integration updated for expired subscriptions!');
          } else {
            console.log('No integration found for expired subscriptions!');
          }
        }

        console.log({ activeSubscriptionDetails });
        if (
          activeSubscriptionDetails &&
          activeSubscriptionDetails?.length > 0
        ) {
          const activeCompanyIds = [
            ...new Set(activeSubscriptionDetails.map((r) => r.company_id)),
          ];

          console.log({ activeCompanyIds });

          const activeXeroIntegrations = await transactionalEntityManager.find(
            XeroIntegrationDetails,
            { where: { company_id: In(activeCompanyIds), status: 'ACTIVE' } },
          );
          console.log({ activeXeroIntegrations });

          if (activeXeroIntegrations && activeXeroIntegrations?.length > 0) {
            const activeXeroCompanyIds = [
              ...new Set(activeXeroIntegrations.map((r) => r.company_id)),
            ];

            console.log({ activeXeroCompanyIds });
            const activeIntegrations = await transactionalEntityManager.find(
              IntegrationDetails,
              {
                where: {
                  company_id: In(activeXeroCompanyIds),
                  integration_status: 'Inactive',
                  previous_status: Not(In(['Inactive', 'Deleted - archived'])),
                },
                order: { company_id: 'DESC' },
              },
            );

            console.log({ activeIntegrations });
            if (activeIntegrations && activeIntegrations?.length > 0) {
              const activeIntegrationIds = [
                ...new Set(activeIntegrations.map((r) => r.integration_id)),
              ];

              console.log({ activeIntegrationIds });

              const updateIntegrationResult = await transactionalEntityManager
                .createQueryBuilder()
                .update(IntegrationDetails)
                .set({
                  previous_status: () =>
                    `(integration_status)::text::integration_details_previous_status_enum`,
                  integration_status: () =>
                    `(previous_status)::text::integration_details_integration_status_enum`,
                  updated_on: moment.tz('UTC'),
                  updated_group: 'SYSTEM',
                })
                .where(`integration_id IN (:...integration_id)`, {
                  integration_id: activeIntegrationIds,
                })
                .execute();

              console.log({ updateIntegrationResult });
              console.log('Integration updated for active subscriptions!');
            }
          }
        }
      }
    } catch (error) {
      console.error(
        'Error in check subscription expiry scheduler: ',
        error?.message ? error.message : error,
      );
    }
  }

  async getAllSubscriptionPlanList(data: GetAllSubscriptionPlanInput) {
    const skip = (data.page_number - 1) * data.page_size;

    const queryBuilder = await this.subscriptionPlanDetails
      .createQueryBuilder('pd')
      .select([
        'pd.id as id',
        'pd.plan_id as plan_id',
        'pd.stripe_product_id as stripe_product_id',
        'pd.plan_name as plan_name',
        'pd.description as description',
        'pd.plan_type as plan_type',
        'pd.plan_status as plan_status',
        'pd.trial_period as trial_period',
        'ppm.price_id as monthly_price_id',
        'ppy.price_id as yearly_price_id',
        'ppm.stripe_price_id as monthly_stripe_price_id',
        'ppy.stripe_price_id as yearly_stripe_price_id',
        'ppm.price_name as monthly_price_name',
        'ppy.price_name as yearly_price_name',
        'ppm.bill_cycle as monthly_bill_cycle',
        'ppy.bill_cycle as yearly_bill_cycle',
        'ppm.plan_price as monthly_price',
        'ppy.plan_price as yearly_price',
        'ppm.is_active as monthly_is_active',
        'ppy.is_active as yearly_is_active',
        'ppm.is_deleted as monthly_is_deleted',
        'ppy.is_deleted as yearly_is_deleted',
        'pi.plan_items as plan_items',
      ])
      .leftJoin(
        SubscriptionPricingPlan,
        'ppm',
        `pd.plan_id = ppm.plan_id AND ppm.bill_cycle = 'Month' AND ppm.id::varchar = ANY(pd.associated_price_ids) AND ppm.is_active = ${data.status === 'Active' ? true : false}`,
      )
      .leftJoin(
        SubscriptionPricingPlan,
        'ppy',
        `pd.plan_id = ppy.plan_id AND ppy.bill_cycle = 'Year' AND ppy.id::varchar = ANY(pd.associated_price_ids) AND ppy.is_active = ${data.status === 'Active' ? true : false}`,
      )
      .leftJoin(
        (qb) =>
          qb
            .select([
              'spi.plan_id as plan_id',
              `json_agg(
              json_build_object(
                  'id', spi.id,
                  'plan_item_id', spi.id,
                  'item_id', spi.item_id,
                  'item_name', si.item_name,
                  'description', si.description,
                  'item_status', si.item_status,
                  'limit_type', si.limit_type,
                  'dropdown_type', si.dropdown_type,
                  'unit_type', si.unit_type,
                  'limit_value', spi.limit_value,
                  'is_unlimited', spi.is_unlimited
              )
          ) as plan_items`,
            ])
            .from(SubscriptionPlanItems, 'spi')
            .innerJoin(
              SubscriptionItems,
              'si',
              `spi.item_id = si.subscription_item_id and si.item_status = 'Active'`,
            )
            .groupBy('spi.plan_id'),
        'pi',
        'pd.plan_id = pi.plan_id',
      );

    if (data.status) {
      queryBuilder.andWhere(`pd.plan_status = :status`, {
        status: data.status,
      });
    }

    if (data.plan_type) {
      queryBuilder.andWhere('pd.plan_type = :plan_type', {
        plan_type: data.plan_type,
      });
    }

    if (data.search) {
      queryBuilder.andWhere(
        `LOWER(pd.plan_name) LIKE LOWER(:keyword)
          `,
        { keyword: `%${data.search.toLowerCase()}%` },
      );
    }

    const sorting_order = data.sorting_order ? data.sorting_order : 'DESC';

    if (!data.sorting_field) {
      queryBuilder.orderBy({ 'pd.created_on': 'DESC' });
    }
    if (data.sorting_field) {
      switch (data.sorting_field) {
        case 'plan_name':
          {
            queryBuilder.orderBy('LOWER(pd.plan_name)', sorting_order);
          }
          break;
        case 'plan_type':
          {
            queryBuilder.orderBy({
              'LOWER(CAST(pd.plan_type AS text))': sorting_order,
            });
          }
          break;
        case 'stripe_product_id':
          {
            queryBuilder.orderBy({
              'LOWER(pd.stripe_product_id)': sorting_order,
            });
          }
          break;
        case 'monthly_price':
          {
            queryBuilder.orderBy({ 'pd.monthly_price': sorting_order });
          }
          break;
        case 'yearly_price':
          {
            queryBuilder.orderBy({ 'pd.yearly_price': sorting_order });
          }
          break;
        case 'plan_status':
          {
            queryBuilder.orderBy({
              'LOWER(CAST(pd.plan_status AS text))': sorting_order,
            });
          }
          break;
      }
    }

    const [rawResults, totalCount] = await Promise.all([
      queryBuilder.getRawMany(),
      queryBuilder.getCount(),
    ]);

    const page_number = data.page_number;
    const items_per_page = data.page_size;

    const startIndex =
      page_number && items_per_page ? (page_number - 1) * items_per_page : 0;
    const endIndex =
      page_number && items_per_page
        ? Math.min(
            (page_number - 1) * items_per_page + items_per_page,
            totalCount,
          )
        : totalCount;
    // Slice the results array to get the results for the current page
    const results = rawResults.slice(startIndex, endIndex);
    return {
      total_count: totalCount,
      plan_list: results?.map((result) => {
        return {
          id: result.id,
          plan_id: result.plan_id,
          stripe_product_id: result.stripe_product_id,
          plan_name: result.plan_name,
          description: result.description,
          plan_type: result.plan_type,
          plan_status: result.plan_status,
          monthly_price_id: result.monthly_price_id,
          yearly_price_id: result.yearly_price_id,
          monthly_stripe_price_id: result.monthly_stripe_price_id,
          yearly_stripe_price_id: result.yearly_stripe_price_id,
          monthly_price_name: result.monthly_price_name,
          yearly_price_name: result.yearly_price_name,
          monthly_bill_cycle: result.monthly_bill_cycle,
          yearly_bill_cycle: result.yearly_bill_cycle,
          monthly_price: formatCurrency(result.monthly_price),
          yearly_price: formatCurrency(result.yearly_price),
          trial_period: result.trial_period,
          monthly_is_active: result.monthly_is_active,
          yearly_is_active: result.yearly_is_active,
          monthly_is_deleted: result.monthly_is_deleted,
          yearly_is_deleted: result.yearly_is_deleted,
          plan_items: result?.plan_items?.map((plan) => {
            return {
              id: plan.id,
              plan_item_id: plan.plan_item_id,
              item_id: plan.item_id,
              item_name: plan.item_name,
              description: plan.description,
              item_status: plan.item_status,
              limit_type: plan.limit_type,
              dropdown_type: plan.dropdown_type,
              unit_type: plan.unit_type,
              limit_value: plan.limit_value,
              is_unlimited: plan.is_unlimited,
            };
          }),
        };
      }),
    };
  }

  async getAllSubscriptionPlanListForUser() {
    const result = await this.subscriptionPlanDetails
      .createQueryBuilder('pd')
      .select([
        'pd.id as id',
        'pd.plan_id as plan_id',
        'pd.stripe_product_id as stripe_product_id',
        'pd.plan_name as plan_name',
        'pd.description as description',
        'pd.plan_type as plan_type',
        'pd.plan_status as plan_status',
        'pd.trial_period as trial_period',
        'ppm.price_id as price_id',
        'ppm.stripe_price_id as stripe_price_id',
        'ppm.price_name as price_name',
        'ppm.bill_cycle as bill_cycle',
        'ppm.plan_price as price',
        'ppm.is_active as is_active',
        'ppm.is_deleted as is_deleted',
        'pi.plan_items as plan_items',
      ])
      .leftJoin(
        SubscriptionPricingPlan,
        'ppm',
        `pd.plan_id = ppm.plan_id AND ppm.id::varchar = ANY(pd.associated_price_ids) AND ppm.is_active = true`,
      )
      .leftJoin(
        (qb) =>
          qb
            .select([
              'spi.plan_id as plan_id',
              `json_agg(
              json_build_object(
                 'plan_item_id', spi.id,
                  'item_id', spi.item_id,
                  'id', si.id,
                  'item_name', si.item_name,
                  'description', si.description,
                  'item_status', si.item_status,
                  'limit_type', si.limit_type,
                  'dropdown_type', si.dropdown_type,
                  'unit_type', si.unit_type,
                  'limit_value', spi.limit_value,
                  'is_unlimited', spi.is_unlimited
                )
              ) as plan_items`,
            ])
            .from(SubscriptionPlanItems, 'spi')
            .innerJoin(
              SubscriptionItems,
              'si',
              `spi.item_id = si.subscription_item_id and si.item_status = 'Active'`,
            )
            .groupBy('spi.plan_id'),
        'pi',
        'pd.plan_id = pi.plan_id',
      )
      .andWhere(`pd.plan_type = 'Free' AND pd.plan_status = 'Active'`)
      .getRawOne();

    const free_plan = {
      id: result.id,
      plan_id: result.plan_id,
      stripe_product_id: result.stripe_product_id,
      plan_name: result.plan_name,
      description: result.description,
      plan_type: result.plan_type,
      plan_status: result.plan_status,
      price_id: result.price_id,
      stripe_price_id: result.stripe_price_id,
      price_name: result.price_name,
      bill_cycle: result.bill_cycle,
      price: formatCurrency(result.price),
      unformatted_price: result.price,
      trial_period: result.trial_period,
      is_active: result.is_active,
      is_deleted: result.is_deleted,
      plan_items: result?.plan_items?.map((plan) => {
        return {
          id: plan.id,
          plan_item_id: plan.plan_item_id,
          item_id: plan.item_id,
          item_name: plan.item_name,
          description: plan.description,
          item_status: plan.item_status,
          limit_type: plan.limit_type,
          dropdown_type: plan.dropdown_type,
          unit_type: plan.unit_type,
          limit_value: plan.limit_value,
          is_unlimited: plan.is_unlimited,
        };
      }),
    };

    const monthlyQueryBuilder = await this.subscriptionPlanDetails
      .createQueryBuilder('pd')
      .select([
        'pd.id as id',
        'pd.plan_id as plan_id',
        'pd.stripe_product_id as stripe_product_id',
        'pd.plan_name as plan_name',
        'pd.description as description',
        'pd.plan_type as plan_type',
        'pd.plan_status as plan_status',
        'pd.trial_period as trial_period',
        'ppm.price_id as price_id',
        'ppm.stripe_price_id as stripe_price_id',
        'ppm.price_name as price_name',
        'ppm.bill_cycle as bill_cycle',
        'ppm.plan_price as price',
        'ppm.is_active as is_active',
        'ppm.is_deleted as is_deleted',
        'pi.plan_items as plan_items',
      ])
      .innerJoin(
        SubscriptionPricingPlan,
        'ppm',
        `pd.plan_id = ppm.plan_id AND ppm.bill_cycle = 'Month' AND ppm.id::varchar = ANY(pd.associated_price_ids) AND ppm.is_active = true`,
      )
      .leftJoin(
        (qb) =>
          qb
            .select([
              'spi.plan_id as plan_id',
              `json_agg(
              json_build_object(
                  'plan_item_id', spi.id,
                  'item_id', spi.item_id,
                  'id', si.id,
                  'item_name', si.item_name,
                  'description', si.description,
                  'item_status', si.item_status,
                  'limit_type', si.limit_type,
                  'dropdown_type', si.dropdown_type,
                  'unit_type', si.unit_type,
                  'limit_value', spi.limit_value,
                  'is_unlimited', spi.is_unlimited
              )
          ) as plan_items`,
            ])
            .from(SubscriptionPlanItems, 'spi')
            .innerJoin(
              SubscriptionItems,
              'si',
              `spi.item_id = si.subscription_item_id and si.item_status = 'Active'`,
            )
            .groupBy('spi.plan_id'),
        'pi',
        'pd.plan_id = pi.plan_id',
      )
      .andWhere(`pd.plan_type = 'Paid' AND pd.plan_status = 'Active'`)
      .orderBy({ 'ppm.plan_price': 'ASC' })
      .getRawMany();

    const monthly_plan_list =
      monthlyQueryBuilder?.map((result) => {
        return {
          id: result.id,
          plan_id: result.plan_id,
          stripe_product_id: result.stripe_product_id,
          plan_name: result.plan_name,
          description: result.description,
          plan_type: result.plan_type,
          plan_status: result.plan_status,
          price_id: result.price_id,
          stripe_price_id: result.stripe_price_id,
          price_name: result.price_name,
          bill_cycle: result.bill_cycle,
          price: formatCurrency(result.price),
          unformatted_price: result.price,
          trial_period: result.trial_period,
          is_active: result.is_active,
          is_deleted: result.is_deleted,
          plan_items: result?.plan_items?.map((plan) => {
            return {
              id: plan.id,
              plan_item_id: plan.plan_item_id,
              item_id: plan.item_id,
              item_name: plan.item_name,
              description: plan.description,
              item_status: plan.item_status,
              limit_type: plan.limit_type,
              dropdown_type: plan.dropdown_type,
              unit_type: plan.unit_type,
              limit_value: plan.limit_value,
              is_unlimited: plan.is_unlimited,
            };
          }),
        };
      }) || [];
    const yearlyQueryBuilder = await this.subscriptionPlanDetails
      .createQueryBuilder('pd')
      .select([
        'pd.id as id',
        'pd.plan_id as plan_id',
        'pd.stripe_product_id as stripe_product_id',
        'pd.plan_name as plan_name',
        'pd.description as description',
        'pd.plan_type as plan_type',
        'pd.plan_status as plan_status',
        'pd.trial_period as trial_period',
        'ppy.price_id as price_id',
        'ppy.stripe_price_id as stripe_price_id',
        'ppy.price_name as price_name',
        'ppy.bill_cycle as bill_cycle',
        'ppy.plan_price as price',
        'ppy.is_active as is_active',
        'ppy.is_deleted as is_deleted',
        'pi.plan_items as plan_items',
      ])
      .innerJoin(
        SubscriptionPricingPlan,
        'ppy',
        `pd.plan_id = ppy.plan_id AND ppy.bill_cycle = 'Year' AND ppy.id::varchar = ANY(pd.associated_price_ids) AND ppy.is_active = true`,
      )
      .leftJoin(
        (qb) =>
          qb
            .select([
              'spi.plan_id as plan_id',
              `json_agg(
              json_build_object(
                  'plan_item_id', spi.id,
                  'item_id', spi.item_id,
                  'id', si.id,
                  'item_name', si.item_name,
                  'description', si.description,
                  'item_status', si.item_status,
                  'limit_type', si.limit_type,
                  'dropdown_type', si.dropdown_type,
                  'unit_type', si.unit_type,
                  'limit_value', spi.limit_value,
                  'is_unlimited', spi.is_unlimited
              )
          ) as plan_items`,
            ])
            .from(SubscriptionPlanItems, 'spi')
            .innerJoin(
              SubscriptionItems,
              'si',
              `spi.item_id = si.subscription_item_id and si.item_status = 'Active'`,
            )
            .groupBy('spi.plan_id'),
        'pi',
        'pd.plan_id = pi.plan_id',
      )
      .andWhere(`pd.plan_type = 'Paid' AND pd.plan_status = 'Active'`)
      .orderBy({ 'ppy.plan_price': 'ASC' })
      .getRawMany();

    const yearly_plan_list =
      yearlyQueryBuilder?.map((result) => {
        return {
          id: result.id,
          plan_id: result.plan_id,
          stripe_product_id: result.stripe_product_id,
          plan_name: result.plan_name,
          description: result.description,
          plan_type: result.plan_type,
          plan_status: result.plan_status,
          price_id: result.price_id,
          stripe_price_id: result.stripe_price_id,
          price_name: result.price_name,
          bill_cycle: result.bill_cycle,
          price: formatCurrency(result.price),
          unformatted_price: result.price,
          trial_period: result.trial_period,
          is_active: result.is_active,
          is_deleted: result.is_deleted,
          plan_items: result?.plan_items?.map((plan) => {
            return {
              id: plan.id,
              plan_item_id: plan.plan_item_id,
              item_id: plan.item_id,
              item_name: plan.item_name,
              description: plan.description,
              item_status: plan.item_status,
              limit_type: plan.limit_type,
              dropdown_type: plan.dropdown_type,
              unit_type: plan.unit_type,
              limit_value: plan.limit_value,
              is_unlimited: plan.is_unlimited,
            };
          }),
        };
      }) || [];

    return { free_plan, monthly_plan_list, yearly_plan_list };
  }

  async viewSubscriptionPlanById(id: string) {
    const result = await this.subscriptionPlanDetails
      .createQueryBuilder('pd')
      .select([
        'pd.id as id',
        'pd.plan_id as plan_id',
        'pd.stripe_product_id as stripe_product_id',
        'pd.plan_name as plan_name',
        'pd.description as description',
        'pd.plan_type as plan_type',
        'pd.plan_status as plan_status',
        'pd.trial_period as trial_period',
        'ppm.price_id as monthly_price_id',
        'ppy.price_id as yearly_price_id',
        'ppm.stripe_price_id as monthly_stripe_price_id',
        'ppy.stripe_price_id as yearly_stripe_price_id',
        'ppm.price_name as monthly_price_name',
        'ppy.price_name as yearly_price_name',
        'ppm.bill_cycle as monthly_bill_cycle',
        'ppy.bill_cycle as yearly_bill_cycle',
        // 'ppm.plan_price as monthly_price',
        // 'ppy.plan_price as yearly_price',
        'CASE WHEN ppm.plan_price IS NULL THEN 0 ELSE ppm.plan_price END as monthly_price',
        'CASE WHEN ppy.plan_price IS NULL THEN 0 ELSE ppy.plan_price END as yearly_price',
        'ppm.is_active as monthly_is_active',
        'ppy.is_active as yearly_is_active',
        'ppm.is_deleted as monthly_is_deleted',
        'ppy.is_deleted as yearly_is_deleted',
        'pi.plan_items as plan_items',
      ])
      .leftJoin(
        SubscriptionPricingPlan,
        'ppm',
        `pd.plan_id = ppm.plan_id AND ppm.bill_cycle = 'Month' AND ppm.id::varchar = ANY(pd.associated_price_ids) AND ppm.is_active = true`,
      )
      .leftJoin(
        SubscriptionPricingPlan,
        'ppy',
        `pd.plan_id = ppy.plan_id AND ppy.bill_cycle = 'Year' AND ppy.id::varchar = ANY(pd.associated_price_ids) AND ppy.is_active = true`,
      )
      .leftJoin(
        (qb) =>
          qb
            .select([
              'spi.plan_id as plan_id',
              `json_agg(
              json_build_object(
                  'plan_item_id', spi.id,
                  'item_id', spi.item_id,
                  'id', si.id,
                  'item_name', si.item_name,
                  'description', si.description,
                  'item_status', si.item_status,
                  'limit_type', si.limit_type,
                  'dropdown_type', si.dropdown_type,
                  'unit_type', si.unit_type,
                  'limit_value', spi.limit_value,
                  'is_unlimited', spi.is_unlimited
              )
          ) as plan_items`,
            ])
            .from(SubscriptionPlanItems, 'spi')
            .innerJoin(
              SubscriptionItems,
              'si',
              `spi.item_id = si.subscription_item_id and si.item_status = 'Active'`,
            )
            .groupBy('spi.plan_id'),
        'pi',
        'pd.plan_id = pi.plan_id',
      )
      .where(`pd.id = :id`, {
        id: id,
      })
      .getRawOne();

    return {
      id: result.id,
      plan_id: result.plan_id,
      stripe_product_id: result.stripe_product_id,
      plan_name: result.plan_name,
      description: result.description,
      plan_type: result.plan_type,
      plan_status: result.plan_status,
      monthly_price_id: result.monthly_price_id,
      yearly_price_id: result.yearly_price_id,
      monthly_stripe_price_id: result.monthly_stripe_price_id,
      yearly_stripe_price_id: result.yearly_stripe_price_id,
      monthly_price_name: result.monthly_price_name,
      yearly_price_name: result.yearly_price_name,
      monthly_bill_cycle: result.monthly_bill_cycle,
      yearly_bill_cycle: result.yearly_bill_cycle,
      unformatted_monthly_price: result.monthly_price,
      unformatted_yearly_price: result.yearly_price,
      monthly_price: formatCurrency(result.monthly_price),
      yearly_price: formatCurrency(result.yearly_price),
      trial_period: result.trial_period,
      monthly_is_active: result.monthly_is_active,
      yearly_is_active: result.yearly_is_active,
      monthly_is_deleted: result.monthly_is_deleted,
      yearly_is_deleted: result.yearly_is_deleted,
      plan_items: result?.plan_items?.map((plan) => {
        return {
          id: plan.id,
          plan_item_id: plan.plan_item_id,
          item_id: plan.item_id,
          item_name: plan.item_name,
          description: plan.description,
          item_status: plan.item_status,
          limit_type: plan.limit_type,
          dropdown_type: plan.dropdown_type,
          unit_type: plan.unit_type,
          limit_value: plan.limit_value,
          is_unlimited: plan.is_unlimited,
        };
      }),
    };
  }

  async getAllSubscribedUsersList(data: GetAllSubscribedUsersInput, timezone) {
    const skip = (data.page_number - 1) * data.page_size;

    const queryBuilder = await this.subscriptionDetails
      .createQueryBuilder('sd')
      .select([
        'sd.id as id',
        'sd.subscription_id as subscription_id',
        'sd.company_id as company_id',
        'sd.plan_id as plan_id',
        'sd.price_id as price_id',
        'sd.amount as unformatted_subscribed_amount',
        'sd.status as subscription_status',
        'sd.start_date as start_date',
        'sd.expiry_date as expiry_date',
        'sd.trial_start as trial_start',
        'sd.trial_end as trial_end',
        'sd.stripe_customer_id as stripe_customer_id',
        'sd.payment_method_id as payment_method_id',
        'sd.stripe_subscription_id as stripe_subscription_id',
        'sd.canceled_at as canceled_at',
        'c.company_name as company_name',
        'c.company_email_id as company_email_id',
        'pd.plan_name as plan_name',
        'pd.plan_status as plan_status',
        'pd.trial_period as trial_period',
        'pd.associated_price_ids as associated_price_ids',
        'pp.stripe_price_id as stripe_price_id',
        'pp.price_name as price_name',
        `CASE WHEN pp.bill_cycle = 'Month' THEN 'Monthly' ELSE 'Yearly' END as bill_cycle`,
        'pp.plan_price as plan_price',
      ])
      .innerJoin(CompanyDetails, 'c', `sd.company_id = c.company_id`)
      .innerJoin(SubscriptionPlanDetails, 'pd', `sd.plan_id = pd.plan_id`)
      .leftJoin(SubscriptionPricingPlan, 'pp', `sd.price_id = pp.price_id`)
      .where(`pd.plan_type = 'Paid'`);

    if (data.company_id) {
      queryBuilder.andWhere('sd.company_id = :company_id', {
        company_id: data.company_id,
      });
    }

    if (data.status) {
      queryBuilder.andWhere(`sd.status = :status`, {
        status: data.status,
      });
    }

    if (data.search) {
      queryBuilder.andWhere(
        `LOWER(c.company_name) LIKE LOWER(:keyword)
          `,
        { keyword: `%${data.search.toLowerCase()}%` },
      );
    }

    if (data.date_filter && timezone) {
      let startDate, endDate;
      if (data.date_filter === 'Custom' && data.start_date && data.end_date) {
        startDate = moment
          .tz(data.start_date, timezone)
          .startOf('day')
          .utc()
          .toDate();
        endDate = moment
          .tz(data.end_date, timezone)
          .endOf('day')
          .utc()
          .toDate();
      } else if (data.date_filter === 'This Month') {
        startDate = moment.tz(timezone).startOf('month').utc().toDate();
        endDate = moment.tz(timezone).endOf('month').utc().toDate();
      } else if (data.date_filter === 'Last Month') {
        startDate = moment
          .tz(timezone)
          .subtract(1, 'month')
          .startOf('month')
          .utc()
          .toDate();
        endDate = moment
          .tz(timezone)
          .subtract(1, 'month')
          .endOf('month')
          .utc()
          .toDate();
      } else if (
        data.date_filter === 'Custom' &&
        !data.start_date &&
        data.end_date
      ) {
        startDate = moment
          .utc(data.end_date)
          .tz(timezone)
          .startOf('year')
          .utc()
          .toDate();
        endDate = moment
          .utc(data.end_date)
          .tz(timezone)
          // .endOf('day')
          .utc()
          .toDate();
      }
      queryBuilder.andWhere('sd.start_date BETWEEN :start_date AND :end_date', {
        start_date: startDate,
        end_date: endDate,
      });
    }

    const sorting_order = data.sorting_order ? data.sorting_order : 'DESC';

    if (!data.sorting_field) {
      queryBuilder.orderBy({ 'sd.updated_on': sorting_order });
    }
    if (data.sorting_field) {
      switch (data.sorting_field) {
        case 'company_name':
          {
            queryBuilder.orderBy('LOWER(c.company_name)', sorting_order);
          }
          break;
        case 'plan_name':
          {
            queryBuilder.orderBy({ 'LOWER(pd.plan_name)': sorting_order });
          }
          break;
        case 'subscribed_amount':
          {
            queryBuilder.orderBy({ 'sd.amount': sorting_order });
          }
          break;
        case 'start_date':
          {
            queryBuilder.orderBy({ 'sd.start_date': sorting_order });
          }
          break;
        case 'expiry_date':
          {
            queryBuilder.orderBy({ 'sd.expiry_date': sorting_order });
          }
          break;
        case 'bill_cycle':
          {
            queryBuilder.orderBy({
              'LOWER(CAST(pp.bill_cycle AS text))': sorting_order,
            });
          }
          break;
        case 'subscription_status':
          {
            queryBuilder.orderBy({
              'LOWER(CAST(sd.status AS text))': sorting_order,
            });
          }
          break;
      }
    }

    const [rawResults, totalCount] = await Promise.all([
      queryBuilder.getRawMany(),
      queryBuilder.getCount(),
    ]);

    const startIndex = data.page_number && data.page_size ? skip : 0;
    const endIndex =
      data.page_number && data.page_size
        ? Math.min(skip + data.page_size, rawResults.length)
        : rawResults.length;
    // Slice the results array to get the results for the current page
    const results = rawResults.slice(startIndex, endIndex);

    return {
      total_count: totalCount,
      user_list: results?.map((result) => {
        return {
          id: result.id,
          subscription_id: result.subscription_id,
          company_id: result.company_id,
          plan_id: result.plan_id,
          price_id: result.price_id,
          subscribed_amount: formatCurrency(
            result.unformatted_subscribed_amount,
          ),
          unformatted_subscribed_amount: result.unformatted_subscribed_amount,
          subscription_status: result.subscription_status,
          start_date: result.start_date,
          expiry_date: result.expiry_date,
          trial_start: result.trial_start,
          trial_end: result.trial_end,
          stripe_customer_id: result.stripe_customer_id,
          payment_method_id: result.payment_method_id,
          canceled_at: result.canceled_at,
          company_name: result.company_name,
          company_email_id: result.company_email_id,
          plan_name: result.plan_name,
          plan_status: result.plan_status,
          stripe_price_id: result.stripe_price_id,
          bill_cycle: result.bill_cycle,
          plan_price: result.plan_price,
          trial_period: result.trial_period,
        };
      }),
    };
  }

  //function to add the subscription item with count when a plan is given.
  async fetchSubscriptionItemsOfaPlan(
    planId: string,
  ): Promise<{ subscriptionItems: PtSubscriptionItem[]; totalCount: number }> {
    const subscriptionItems = await this.subscriptionPlanItems
      .createQueryBuilder('planItem')
      .leftJoinAndSelect('planItem.item', 'item')
      .leftJoinAndSelect('planItem.plan', 'plan')
      .where('plan.id = :planId', { planId: planId })
      .andWhere('item.item_status = :itemStatus', { itemStatus: 'Active' })
      .getMany();

    const mappedSubItems: PtSubscriptionItem[] = subscriptionItems.map(
      (subItem) => ({
        id: subItem.item.id,
        item_name: subItem.item.item_name,
        description: subItem.item.description,
        item_status: subItem.item.item_status,
        limit_type: subItem.item.limit_type,
        dropdown_type: subItem.item.dropdown_type,
        unit_type: subItem.item.unit_type,
      }),
    );

    return {
      subscriptionItems: mappedSubItems,
      totalCount: subscriptionItems.length,
    };
  }

  //get plans for dropdown
  // async getSubscriptionPlans(): Promise<GetSubscriptionPlansResponse> {
  //   try {
  //     const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
  //       apiVersion: '2024-06-20',
  //     });
  //     const prices = await stripe.prices.list({
  //       product: process.env.STRIPE_PRODUCT_ID,
  //       active: true, // Only fetch active prices
  //     });

  //     if (prices.data.length === 0) {
  //       throw new Error(
  //         `No active plans found for product ID: ${process.env.STRIPE_PRODUCT_ID}`,
  //       );
  //     }
  //     // Map over the prices to create an array of { id, name } objects
  //     const priceOptions = prices.data.map((price) => ({
  //       value: price.id,
  //       label: price.nickname || `Price ${price.id}`, // Use nickname if available, otherwise use a default name
  //     }));

  //     return framedResponse(
  //       'SUCCESS',
  //       `Fetched all plan prices frm stripe successfully.`,
  //       priceOptions,
  //     );
  //   } catch (error) {
  //     console.error('Error retrieving price options:', error);
  //     throw new Error(error.message);
  //   }
  // }

  async getOrCreatePercentCoupon({
    duration,
    months,
    entity,
    name,
    percent_off,
  }: {
    duration: StripeCouponDurationType;
    months?: number;
    entity?: EntityManager;
    name: string;
    percent_off?: number;
  }) {
    try {
      const coupon = await this.stripe.coupons.create({
        percent_off: percent_off ?? 100,
        duration: duration,
        ...(duration === 'repeating' && {
          duration_in_months: months,
        }),
        name: name,
      });

      console.log('coupon: ', coupon);

      return coupon;
    } catch (error) {
      throw error;
    }
  }

  async giftSubscriptionToBusiness(
    payload: GiftSubscriptionInput,
    decoded: any,
  ) {
    try {
      return true;
      // return await this.entityManager.transaction(
      //   async (transactionalEntityManager) => {
      //     const { company_id, price_id, duration, months } = payload;

      //     const companyDetails = await transactionalEntityManager.findOne(
      //       CompanyDetails,
      //       {
      //         where: { company_id },
      //         relations: ['subscriptionDetails'],
      //       },
      //     );

      //     if (!companyDetails) throw `Company Details not found.`;

      //     if (!companyDetails.subscriptionDetails) {
      //       const subscriptionPlanDetails = await transactionalEntityManager
      //         .createQueryBuilder(SubscriptionPlanDetails, 'pd')
      //         .select([
      //           'pd.id as id',
      //           'pd.plan_id as plan_id',
      //           'pd.plan_type as plan_type',
      //           'pd.plan_status as plan_status',
      //           'pp.price_id as price_id',
      //           'pp.plan_price as price',
      //         ])
      //         .leftJoin(
      //           SubscriptionPricingPlan,
      //           'pp',
      //           `pd.plan_id = pp.plan_id AND pp.id::varchar = ANY(pd.associated_price_ids) AND pp.is_active = true`,
      //         )
      //         .where(`pd.plan_type = 'Free' and pd.plan_status = 'Active'`)
      //         .getRawOne();

      //       let createSubscriptionInput: CreateSubscriptionInput = {
      //         company_id: company_id,
      //         plan_id: subscriptionPlanDetails.plan_id,
      //         price_id: subscriptionPlanDetails.price_id,
      //         amount: subscriptionPlanDetails.price,
      //         start_date: moment.tz('UTC'),
      //         created_by: decoded?.userId,
      //         created_on: moment.tz('UTC'),
      //         created_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
      //       };
      //       const createSubscriptionDetails =
      //         await transactionalEntityManager.create(
      //           SubscriptionDetails,
      //           createSubscriptionInput,
      //         );
      //       await transactionalEntityManager.save(
      //         SubscriptionDetails,
      //         createSubscriptionDetails,
      //       );
      //     }

      //     const oldSubscriptionDetails =
      //       await transactionalEntityManager.findOne(SubscriptionDetails, {
      //         where: { company_id },
      //       });

      //     let stripe_customer_id;
      //     if (!oldSubscriptionDetails.stripe_customer_id) {
      //       // Create a new customer
      //       const customer = await this.stripe.customers.create({
      //         name: companyDetails.company_name,
      //         email: companyDetails.company_email_id,
      //         phone: companyDetails.company_phone_no,
      //       });
      //       stripe_customer_id = customer.id;
      //       const subscriptionDetails = await transactionalEntityManager
      //         .createQueryBuilder()
      //         .update(SubscriptionDetails)
      //         .set({
      //           stripe_customer_id: stripe_customer_id,
      //           updated_by: decoded?.userId,
      //           updated_on: moment.tz('UTC'),
      //           updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
      //         })
      //         .where(`company_id = :company_id`, { company_id })
      //         .execute();
      //     } else {
      //       stripe_customer_id = oldSubscriptionDetails.stripe_customer_id;
      //     }

      //     const subscriptionDetails = await transactionalEntityManager.findOne(
      //       SubscriptionDetails,
      //       {
      //         where: { company_id },
      //         relations: ['planDetails', 'pricingPlan'],
      //       },
      //     );

      //     const pricingDetails = await transactionalEntityManager.findOne(
      //       SubscriptionPricingPlan,
      //       {
      //         where: { price_id },
      //         relations: ['planDetails'],
      //       },
      //     );

      //     const coupon = await this.getOrCreatePercentCoupon({
      //       duration,
      //       entity: transactionalEntityManager,
      //     });

      //     if (subscriptionDetails.planDetails.plan_type === 'Free') {
      //       const start_date = moment.tz('UTC');
      //       const expiryDate =
      //         pricingDetails.planDetails.trial_period > 0
      //           ? moment(start_date)
      //               .add(pricingDetails.planDetails.trial_period, 'months')
      //               .utc()
      //           : pricingDetails.bill_cycle === 'Month'
      //             ? moment(start_date).add(1, 'months').utc()
      //             : moment(start_date).add(1, 'years').utc();

      //       const subscription = await this.stripe.subscriptions.create({
      //         customer: stripe_customer_id,
      //         items: [
      //           {
      //             price: pricingDetails.stripe_price_id,
      //           },
      //         ],
      //         coupon: coupon.id,
      //         expand: ['latest_invoice.payment_intent'],
      //       });

      //       console.log('subscription create: ', subscription);

      //       if (subscription && subscription.status) {
      //         let subscriptionStatus =
      //           await this.paymentGatewayService.getSubscriptionStatus(
      //             subscription.status,
      //           );
      //         const updateSubscriptionDetails = await transactionalEntityManager
      //           .createQueryBuilder()
      //           .update(SubscriptionDetails)
      //           .set({
      //             plan_id: pricingDetails.plan_id,
      //             price_id: pricingDetails.price_id,
      //             amount: pricingDetails.plan_price,
      //             start_date: start_date,
      //             expiry_date: expiryDate.toDate(),
      //             status: subscriptionStatus,
      //             stripe_subscription_id: subscription.id,
      //             trial_start: subscription.trial_start
      //               ? moment.unix(subscription.trial_start).utc().toDate()
      //               : subscription.trial_start,
      //             trial_end: subscription.trial_end
      //               ? moment.unix(subscription.trial_end).utc().toDate()
      //               : subscription.trial_end,
      //             canceled_at: subscription.canceled_at
      //               ? moment.unix(subscription.canceled_at).utc().toDate()
      //               : subscription.canceled_at,
      //             updated_by: decoded?.userId,
      //             updated_on: moment.tz('UTC'),
      //             updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
      //           })
      //           .where(`company_id = :company_id`, { company_id })
      //           .execute();
      //       }
      //     } else if (
      //       (subscriptionDetails.planDetails.plan_type === 'Paid' &&
      //         subscriptionDetails.pricingPlan.bill_cycle === 'Month') ||
      //       (subscriptionDetails.planDetails.plan_type === 'Paid' &&
      //         subscriptionDetails.pricingPlan.bill_cycle === 'Year')
      //     ) {
      //       // Retrieve the existing subscription
      //       const oldSubscription = await this.stripe.subscriptions.retrieve(
      //         subscriptionDetails.stripe_subscription_id,
      //       );

      //       // Update the subscription to use the yearly price
      //       const subscription = await this.stripe.subscriptions.update(
      //         subscriptionDetails.stripe_subscription_id,
      //         {
      //           items: [
      //             {
      //               id: oldSubscription.items.data[0].id,
      //               price: pricingDetails.stripe_price_id,
      //             },
      //           ],
      //           proration_behavior: 'create_prorations',
      //         },
      //       );

      //       if (subscription && subscription.status) {
      //         let subscriptionStatus =
      //           await this.paymentGatewayService.getSubscriptionStatus(
      //             subscription.status,
      //           );

      //         const updateSubscriptionDetails = await transactionalEntityManager
      //           .createQueryBuilder()
      //           .update(SubscriptionDetails)
      //           .set({
      //             plan_id: pricingDetails.plan_id,
      //             price_id: pricingDetails.price_id,
      //             amount: pricingDetails.plan_price,
      //             // start_date: start_date,
      //             // expiry_date: expiryDate.toDate(),
      //             status: subscriptionStatus,
      //             stripe_subscription_id: subscription.id,
      //             trial_start: subscription.trial_start
      //               ? moment.unix(subscription.trial_start).utc().toDate()
      //               : subscription.trial_start,
      //             trial_end: subscription.trial_end
      //               ? moment.unix(subscription.trial_end).utc().toDate()
      //               : subscription.trial_end,
      //             canceled_at: subscription.canceled_at
      //               ? moment.unix(subscription.canceled_at).utc().toDate()
      //               : subscription.canceled_at,
      //             updated_by: decoded?.userId,
      //             updated_on: moment.tz('UTC'),
      //             updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
      //           })
      //           .where(`company_id = :company_id`, { company_id })
      //           .execute();
      //       }

      //       return await transactionalEntityManager.findOne(
      //         SubscriptionDetails,
      //         {
      //           where: { company_id },
      //         },
      //       );
      //     } else {
      //       throw `You are already subscribed to the highest available plan. Upgrade is not possible at this time.`;
      //     }

      //     return await transactionalEntityManager.findOne(SubscriptionDetails, {
      //       where: { company_id },
      //     });
      //   },
      // );
    } catch (error) {
      const errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Error while upgrading the gift subscription: ${errorMessage}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        return error;
      });
      throw errMsg;
    }
  }

  async checkGiftCouponExistence(keyword: string) {
    return await this.stripeCoupons
      .createQueryBuilder('sc')
      .select([
        'sc.id as id',
        'sc.coupon_id as coupon_id',
        'sc.stripe_coupon_id as stripe_coupon_id',
        'sc.coupon_name as coupon_name',
        'sc.percent_off as percent_off',
        'sc.duration as duration',
        'sc.duration_in_months as duration_in_months',
        'sc.coupon_status as coupon_status',
        'sc.created_on as created_on',
        'sc.created_by as created_by',
        'sc.updated_on as updated_on',
        'sc.created_group as created_group',
      ])
      .where('LOWER(sc.coupon_name) LIKE LOWER(:keyword)', {
        keyword: `${keyword.toLowerCase()}`,
      })
      .andWhere(`sc.coupon_status = 'Active'`)
      .getRawMany();
  }

  async adminGiftCouponById(id: string) {
    try {
      const result = await this.stripeCoupons.findOne({
        where: { id },
      });

      if (!result) {
        // Handle the case where no data is found for the given id
        throw new Error(`Coupon with id ${id} not found`);
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  async addGiftCoupon(payload: AddGiftCouponInput, decoded: any) {
    try {
      return await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          const {
            coupon_name,
            coupon_status,
            duration,
            duration_in_months,
            percent_off,
          } = payload;

          const existingCoupon = await transactionalEntityManager.findOne(
            StripeCoupons,
            {
              where: {
                coupon_name: ILike(`${coupon_name}`),
                coupon_status: 'Active',
              },
            },
          );

          if (existingCoupon) {
            throw 'Already coupon name exists';
          }

          const durationArr = ['forever', 'repeating', 'once'];

          if (percent_off > 100) {
            throw 'Percentage less than or equal to 100';
          }

          if (!durationArr.includes(duration)) {
            throw 'Invalid duration value';
          }

          const coupon = await this.getOrCreatePercentCoupon({
            duration,
            months: duration_in_months,
            name: coupon_name,
            percent_off,
          });

          if (coupon && coupon.id) {
            const createCouponPayload = await this.stripeCoupons.create({
              ...payload,
              stripe_coupon_id: coupon?.id,
              created_by: decoded?.userId,
              created_on: moment.tz('UTC'),
              created_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
            });

            const addedCoupon =
              await transactionalEntityManager.save(createCouponPayload);

            addedCoupon.coupon_id = 100000 + Number(addedCoupon.coupon_id);

            return await transactionalEntityManager.save(addedCoupon);
          } else {
            throw `Error thrown while creating coupon using stripe ${coupon}.`;
          }
        },
      );
    } catch (error) {
      const errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Error while upgrading the gift subscription: ${errorMessage}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        return error;
      });
      throw errMsg;
    }
  }

  async adminUpdateGiftCoupon(payload: UpdateStripeCouponInput, decoded: any) {
    try {
      return await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          const { id, coupon_status } = payload;

          const couponDetail = await this.stripeCoupons.findOne({
            where: {
              id: id,
              coupon_status: 'Active',
            },
          });

          if (!couponDetail) {
            throw `Coupon detail with ${couponDetail} not found.`;
          }

          if (coupon_status === 'Inactive') {
            const updatedCoupon = await this.stripe.coupons.update(
              couponDetail?.stripe_coupon_id,
              {
                metadata: {
                  status: 'archived',
                },
              },
            );

            if (updatedCoupon && updatedCoupon?.id) {
              couponDetail.coupon_status = coupon_status;
              couponDetail.updated_by = decoded?.userId;
              couponDetail.updated_on = moment.tz('UTC');
              couponDetail.updated_group = decoded?.isAdmin ? 'ADMIN' : 'USER';

              return await transactionalEntityManager.save(couponDetail);
            } else {
              throw `Error thrown while updating coupon status using stripe ${updatedCoupon}.`;
            }
          } else if (coupon_status === 'Deleted') {
            couponDetail.coupon_status = coupon_status;
            couponDetail.updated_by = decoded?.userId;
            couponDetail.updated_on = moment.tz('UTC');
            couponDetail.updated_group = decoded?.isAdmin ? 'ADMIN' : 'USER';
            return await transactionalEntityManager.save(couponDetail);
          }

          return couponDetail;
        },
      );
    } catch (error) {
      const errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Error while upgrading the gift subscription: ${errorMessage}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        return error;
      });
      throw errMsg;
    }
  }

  async adminGiftCouponList(
    keyword: string,
    status: string,
    page: number,
    perPage: number,
    sorting_field: string,
    sorting_order: SortingOrder | 'DESC',
  ) {
    try {
      const queryBuilder = this.stripeCoupons
        .createQueryBuilder('sc')
        .select([
          'sc.id as id',
          'sc.coupon_id as coupon_id',
          'sc.stripe_coupon_id as stripe_coupon_id',
          'sc.coupon_name as coupon_name',
          'sc.percent_off as percent_off',
          'sc.duration as duration',
          'sc.duration_in_months as duration_in_months',
          'sc.coupon_status as coupon_status',
          'sc.created_on as created_on',
          'sc.created_by as created_by',
          'sc.updated_on as updated_on',
          'sc.created_group as created_group',
        ]);

      if (keyword) {
        queryBuilder.andWhere('sc.coupon_name ILIKE :keyword', {
          keyword: `%${keyword}%`,
        });
      }

      if (status) {
        queryBuilder.andWhere('sc.coupon_status = :itemStatus', {
          itemStatus: status,
        });
      } else {
        queryBuilder.andWhere('sc.coupon_status NOT IN (:...status)', {
          status: ['Deleted', 'Inactive'],
        });
      }

      if (!sorting_field) {
        queryBuilder.orderBy({ 'sc.created_on': 'DESC' });
      }

      if (sorting_field) {
        switch (sorting_field) {
          case 'coupon_name':
            {
              queryBuilder.orderBy({
                'LOWER(sc.coupon_name)': sorting_order,
              });
            }
            break;
          case 'percent_off':
            {
              queryBuilder.orderBy({
                'sc.percent_off': sorting_order,
              });
            }
            break;
          case 'duration':
            {
              queryBuilder.orderBy({
                'LOWER(CAST(sc.duration AS text))': sorting_order,
              });
            }
            break;
          case 'duration_in_months':
            {
              queryBuilder.orderBy({
                'sc.duration_in_months': sorting_order,
              });
            }
            break;
          case 'coupon_status':
            {
              queryBuilder.orderBy({
                'LOWER(CAST(sc.coupon_status AS text))': sorting_order,
              });
            }
            break;
        }
      }

      const [result, total_count] = await Promise.all([
        page && perPage
          ? queryBuilder
              .offset((page - 1) * perPage)
              .limit(perPage)
              .getRawMany()
          : queryBuilder.getRawMany(),
        queryBuilder.getCount(),
      ]);

      return { result, total_count };
    } catch (error) {
      throw error;
    }
  }

  async validateCoupon(coupon: string, company_id: number) {
    try {
      const ptCoupon = await this.stripeCoupons
        .createQueryBuilder('c')
        .where('c.coupon_name = :name', { name: coupon })
        // .where('LOWER(c.coupon_name) = LOWER(:name)', { name: coupon })
        .andWhere(`c.coupon_status = 'Active'`)
        .getOne();

      if (!ptCoupon) {
        throw new Error('Coupon not found');
      }

      if (company_id) {
        const appliedCmpyCouponns = await this.companyCouponDetails.findOne({
          where: {
            company_id,
            coupon_id: ptCoupon.coupon_id,
          },
        });

        if (appliedCmpyCouponns) {
          throw new Error('This coupon has already been used');
        }
      }

      const couponDetail = await this.stripe.coupons.retrieve(
        ptCoupon.stripe_coupon_id,
      );

      console.log('couponDetail: ', couponDetail);

      if (!couponDetail || couponDetail.deleted) {
        throw new Error('Invalid or expired coupon');
      }

      return ptCoupon;
    } catch (error) {
      const errorMessage = error.message ? error.message : error;
      this.logger.error(`Error while validating coupon: ${errorMessage}`);
      const errMsg = await handleError(error).catch((error) => {
        return error;
      });
      throw errMsg;
    }
  }

  async companyAppliedCouponList(
    keyword: string,
    status: string,
    page: number,
    perPage: number,
    sorting_field: string,
    sorting_order: SortingOrder | 'DESC',
    company_id: number,
    coupon_id: number,
  ) {
    try {
      const queryBuilder = this.companyCouponDetails
        .createQueryBuilder('cc')
        .select([
          'cc.id as id',
          'cc.company_id as company_id',
          'company.company_name as company_name',
          'cc.coupon_id as coupon_id',
          'coupon.coupon_name as coupon_name',
          'coupon.percent_off as percent_off',
          'coupon.duration as duration',
          'cc.applied_on as applied_on',
          'cc.usage_count as usage_count',
          'cc.applied_coupon_status as applied_coupon_status',
        ])
        .innerJoin('cc.companyDetails', 'company')
        .innerJoin('cc.coupon', 'coupon');

      if (keyword) {
        queryBuilder.andWhere(
          '(coupon.coupon_name ILIKE :keyword OR company.company_name ILIKE :keyword)',
          {
            keyword: `%${keyword}%`,
          },
        );
      }

      if (coupon_id) {
        queryBuilder.andWhere('cc.coupon_id = :coupon_id', { coupon_id });
      }

      if (company_id) {
        queryBuilder.andWhere('cc.company_id = :company_id', { company_id });
      }

      if (!sorting_field) {
        queryBuilder.orderBy({ 'cc.applied_on': 'DESC' });
      }

      if (sorting_field) {
        switch (sorting_field) {
          case 'coupon_name':
            {
              queryBuilder.orderBy({
                'LOWER(coupon.coupon_name)': sorting_order,
              });
            }
            break;
          case 'percent_off':
            {
              queryBuilder.orderBy({
                'coupon.percent_off': sorting_order,
              });
            }
            break;
          case 'duration':
            {
              queryBuilder.orderBy({
                'LOWER(CAST(coupon.duration AS text))': sorting_order,
              });
            }
            break;
          case 'company_name':
            {
              queryBuilder.orderBy({
                'LOWER(company.company_name)': sorting_order,
              });
            }
            break;
          case 'usage_count':
            {
              queryBuilder.orderBy({
                'cc.usage_count': sorting_order,
              });
            }
            break;
          case 'applied_on':
            {
              queryBuilder.orderBy({
                'cc.applied_on': sorting_order,
              });
            }
            break;
        }
      }

      const [result, total_count] = await Promise.all([
        page && perPage
          ? queryBuilder
              .offset((page - 1) * perPage)
              .limit(perPage)
              .getRawMany()
          : queryBuilder.getRawMany(),
        queryBuilder.getCount(),
      ]);

      return { result, total_count };
    } catch (error) {
      throw error;
    }
  }

  async getMailTemplateByMailType(mailType: string) {
    const result = await this.emailTemplates.findOne({
      where: { email_type: mailType },
    });
    if (!result) {
      // Handle the case where no data is found for the given id
      throw new Error(`Template ${mailType} not found`);
    }
    return result;
  }

  async replaceVariables(template: string, variables: Record<string, string>) {
    return new Promise(async (resolve, reject) => {
      try {
        let result = template;
        if (Object.keys(result).length !== 0) {
          for (const [key, value] of Object.entries(variables)) {
            result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
          }
        }
        this.logger.log(
          `Response received with result: ${JSON.stringify(result)}`,
        );
        resolve(result);
      } catch (error) {
        this.logger.error(
          `Errored while replacing variables with message: ${error.message}`,
        );
      }
    });
  }
}
