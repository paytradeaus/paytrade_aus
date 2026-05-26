import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { SubscriptionPlanItems } from 'src/entities/subscription-plan-items.entity';
import {
  EntityManager,
  In,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Not,
  Repository,
} from 'typeorm';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { CreateSubscriptionInput } from 'src/api/users/signup/dto/create-subscription.input';
import { SubscriptionPricingPlan } from 'src/entities/subscription-pricing-plan.entity';
import { SubscriptionPlanDetails } from 'src/entities/subscription-plan-details.entity';
import { CreateOrUpdateSubscriptionInput } from './dto/payment-gateway.input';
import { handleError } from '../error-handler';
import { GetPaymentHistoryInput } from './dto/get-payment-history.input';
import { SubscriptionTransaction } from 'src/entities/subscription-transactions.entity';
import { formatCurrency } from 'src/libs/@currency-formattor/currency-formattor';
import { CreateActivityLogInput } from '../activity-log/dto/create-activity-log.input';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { linkExtensions } from '../activity-log/link-extensions';
import { SubscriptionItems } from 'src/entities/subscription-items.entity';
import { StripeCoupons } from 'src/entities/subscription-coupon.entity';
import { CompanyCouponDetails } from 'src/entities/company-coupon-details.entity';
import { IntegrationDetails } from 'src/entities/integration-details.entity';
import { getStripeInstance } from 'src/libs/@stripe-helper/stripe-helper';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Injectable()
export class PaymentGatewayService implements OnApplicationBootstrap {
  private logger: PaytradeLogger;
  // Cache of the Stripe AU GST tax-rate id, keyed by
  // `${isDemo}:${inclusive}` (live vs test mode use separate Stripe
  // accounts -> separate ids; and Stripe tax-rate objects are immutable
  // on the `inclusive` flag so inclusive and exclusive rates are
  // distinct objects we must look up / cache independently).
  private gstTaxRateIdCache: Map<string, string> = new Map();
  constructor(
    @InjectRepository(SubscriptionPlanItems)
    private subscriptionPlanItems: Repository<SubscriptionPlanItems>,
    @InjectRepository(SubscriptionDetails)
    private subscriptionDetails: Repository<SubscriptionDetails>,
    @InjectRepository(SubscriptionPlanDetails)
    private subscriptionPlanDetails: Repository<SubscriptionPlanDetails>,
    @InjectRepository(SubscriptionPricingPlan)
    private subscriptionPricingPlan: Repository<SubscriptionPricingPlan>,
    @InjectRepository(SubscriptionTransaction)
    private subscriptionTransaction: Repository<SubscriptionTransaction>,
    @InjectRepository(CompanyDetails)
    private companyDetails: Repository<CompanyDetails>,
    @InjectRepository(StripeCoupons)
    private stripeCoupons: Repository<StripeCoupons>,
    @InjectRepository(CompanyCouponDetails)
    private companyCouponDetails: Repository<CompanyCouponDetails>,
    @InjectRepository(IntegrationDetails)
    private integrationDetails: Repository<IntegrationDetails>,
    private activityLogService: ActivityLogService,
    private entityManager: EntityManager,
  ) {
    this.logger = new PaytradeLogger('GATEWAY_SERVICE');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  /**
   * Resolve (find-or-create) the Stripe tax-rate id representing the
   * Australian 10% GST. Used to tag new subscriptions so Stripe charges
   * GST on top of (or as part of) the headline plan price and renders
   * the GST line on invoices.
   *
   * `inclusive=false` (default): GST is added on top of the headline
   *   (e.g. $50/mo -> $55/mo charged). All new subs use this.
   * `inclusive=true`: headline is treated as GST-inclusive
   *   (e.g. $300 charged -> $272.73 ex-GST + $27.27 GST shown on
   *   invoice). Reserved for legacy subs flagged via
   *   `LEGACY_INCLUSIVE_GST_SUB_IDS` and `subscription_details.is_gst_inclusive`.
   *
   * Existing subscriptions are NEVER mutated by this helper itself — it
   * only resolves the id; mutation is done at call sites that know
   * which side of the inclusive/exclusive split a sub belongs on.
   *
   * Hardened (Task #312): callers expecting a real id must now treat
   * `null` as a fatal config error. The previous silent-null fallback
   * caused new sign-ups to silently skip GST when the rate lookup
   * failed; the boot-time health check below verifies the live
   * exclusive rate is resolvable so production never gets into that
   * state unnoticed.
   */
  private async getAuGstTaxRateId(
    stripe: any,
    isDemo: boolean,
    inclusive: boolean = false,
  ): Promise<string | null> {
    const cacheKey = `${isDemo}:${inclusive}`;
    try {
      const cached = this.gstTaxRateIdCache.get(cacheKey);
      if (cached) return cached;

      const existing = await stripe.taxRates.list({
        active: true,
        limit: 100,
      });
      const match = (existing?.data ?? []).find(
        (r: any) =>
          r.percentage === 10 &&
          r.inclusive === inclusive &&
          (r.country === 'AU' || r.jurisdiction === 'AU') &&
          (r.display_name === 'GST' || r.display_name === 'Australian GST'),
      );
      if (match?.id) {
        this.gstTaxRateIdCache.set(cacheKey, match.id);
        return match.id;
      }

      const created = await stripe.taxRates.create({
        display_name: 'GST',
        description: inclusive
          ? 'Australian Goods and Services Tax (10%, inclusive)'
          : 'Australian Goods and Services Tax (10%)',
        percentage: 10,
        inclusive,
        country: 'AU',
        jurisdiction: 'AU',
      });
      if (created?.id) {
        this.gstTaxRateIdCache.set(cacheKey, created.id);
        this.log(
          `Created Stripe AU GST tax rate (isDemo=${isDemo}, inclusive=${inclusive}, id=${created.id}).`,
        );
        return created.id;
      }
      return null;
    } catch (error) {
      this.logError(
        `Failed to resolve Stripe AU GST tax rate (isDemo=${isDemo}, inclusive=${inclusive}): ${error?.message ?? error}`,
      );
      return null;
    }
  }

  /**
   * Boot-time health check: verify the live exclusive AU GST rate is
   * resolvable. If not, log a loud error so operators notice BEFORE a
   * new sign-up silently skips GST. Demo (test-mode) and inclusive
   * rates are resolved lazily on first use.
   *
   * DO NOT enable Stripe Tax (automatic_tax) in the Stripe dashboard —
   * this codebase uses manual `default_tax_rates` and assumes Stripe
   * will not also add an automatic tax line, which would double-charge
   * the customer.
   */
  async onApplicationBootstrap(): Promise<void> {
    try {
      const stripe = getStripeInstance(false);
      const rateId = await this.getAuGstTaxRateId(stripe, false, false);
      if (!rateId) {
        this.logError(
          'GST_HEALTH_CHECK: live AU 10% exclusive GST tax-rate could not be resolved. New paid subscriptions will be created WITHOUT a GST line. Fix Stripe credentials / connectivity immediately.',
        );
      } else {
        this.log(
          `GST_HEALTH_CHECK ok: live exclusive AU GST rate resolved (${rateId}).`,
        );
      }
    } catch (err: any) {
      this.logError(
        `GST_HEALTH_CHECK failed unexpectedly: ${err?.message || err}`,
      );
    }
  }

  private async isCompanyDemo(companyId: number): Promise<boolean> {
    if (!companyId) return false;
    const company = await this.companyDetails.findOne({
      where: { company_id: companyId },
      select: ['is_demo'],
    });
    return company?.is_demo ?? false;
  }

  async checkCompanyDemoStatus(companyId: number): Promise<boolean> {
    return this.isCompanyDemo(companyId);
  }

  private async isCompanyDemoByStripeCustomer(stripeCustomerId: string): Promise<boolean> {
    if (!stripeCustomerId) return false;
    const sub = await this.subscriptionDetails.findOne({
      where: { stripe_customer_id: stripeCustomerId },
      select: ['company_id'],
    });
    if (!sub) return false;
    return this.isCompanyDemo(sub.company_id);
  }

  async upgradeSubscription(
    data: CreateOrUpdateSubscriptionInput,
    decoded,
  ): Promise<any> {
    try {
      return await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          const {
            company_id,
            payment_method_id,
            price_id,
            signature,
            signature_type,
            coupon_id,
          } = data;

          // const isAdmin = ['RESTRICTED PORTAL ADMIN', 'PORTAL ADMIN']?.includes(
          //   decoded?.role,
          // );

          const companyDetails = await transactionalEntityManager.findOne(
            CompanyDetails,
            {
              where: { company_id },
              relations: ['subscriptionDetails'],
            },
          );

          if (!companyDetails) throw `Company Details not found.`;

          // if (isAdmin && !coupon_id) throw `Coupon id required`;

          const companyLink =
            `${process.env.LOG_BASE_URL}` +
            `${linkExtensions[20]}` +
            `${companyDetails.company_id}` +
            `?from=log`;

          if (!companyDetails.subscriptionDetails) {
            const subscriptionPlanDetails = await transactionalEntityManager
              .createQueryBuilder(SubscriptionPlanDetails, 'pd')
              .select([
                'pd.id as id',
                'pd.plan_id as plan_id',
                'pd.plan_type as plan_type',
                'pd.plan_status as plan_status',
                'pp.price_id as price_id',
                'pp.plan_price as price',
              ])
              .leftJoin(
                SubscriptionPricingPlan,
                'pp',
                `pd.plan_id = pp.plan_id AND pp.id::varchar = ANY(pd.associated_price_ids) AND pp.is_active = true`,
              )
              .where(`pd.plan_type = 'Free' and pd.plan_status = 'Active' and pd.is_sandbox = :isSandbox`, { isSandbox: !!companyDetails.is_demo })
              .getRawOne();

            let createSubscriptionInput: CreateSubscriptionInput = {
              company_id: company_id,
              plan_id: subscriptionPlanDetails.plan_id,
              price_id: subscriptionPlanDetails.price_id,
              amount: subscriptionPlanDetails.price,
              start_date: moment.tz('UTC'),
              created_by: decoded?.userId,
              created_on: moment.tz('UTC'),
              created_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
            };
            const createSubscriptionDetails =
              await transactionalEntityManager.create(
                SubscriptionDetails,
                createSubscriptionInput,
              );
            await transactionalEntityManager.save(
              SubscriptionDetails,
              createSubscriptionDetails,
            );
          }

          const oldSubscriptionDetails =
            await transactionalEntityManager.findOne(SubscriptionDetails, {
              where: { company_id },
            });

          const isDemo = await this.isCompanyDemo(company_id);
          const stripe = getStripeInstance(isDemo);

          let stripe_customer_id;
          if (!oldSubscriptionDetails.stripe_customer_id) {
            // Create a new customer with default payment method id
            const customer = await stripe.customers.create({
              name: companyDetails.company_name,
              email: companyDetails.company_email_id,
              phone: companyDetails.company_phone_no,
              ...(payment_method_id && {
                payment_method: payment_method_id,
                invoice_settings: {
                  default_payment_method: payment_method_id,
                },
              }),
            });
            stripe_customer_id = customer.id;
            const subscriptionDetails = await transactionalEntityManager
              .createQueryBuilder()
              .update(SubscriptionDetails)
              .set({
                stripe_customer_id: stripe_customer_id,
                payment_method_id: payment_method_id ?? null,
                updated_by: decoded?.userId,
                updated_on: moment.tz('UTC'),
                updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
              })
              .where(`company_id = :company_id`, { company_id })
              .execute();

            if (payment_method_id) {
              const createActivityLogInput: CreateActivityLogInput = {
                event_template_id: 34,
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
                is_admin: false,
                created_by: decoded?.userId,

                company_id: company_id,
              };
              await this.activityLogService.insertActivityLog(
                createActivityLogInput,
              );
            }
          } else {
            stripe_customer_id = oldSubscriptionDetails.stripe_customer_id;

            if (
              // !isAdmin &&
              !oldSubscriptionDetails.payment_method_id &&
              !payment_method_id
            )
              throw `Please provide the payment method to complete the subscription.`;

            // here
            if (
              payment_method_id &&
              (!oldSubscriptionDetails.payment_method_id ||
                oldSubscriptionDetails.payment_method_id !== payment_method_id)
            ) {
              // Attach the existing customer with payment method id and set as default
              const response = await stripe.paymentMethods.attach(
                payment_method_id,
                {
                  customer: stripe_customer_id,
                },
              );
              const response1 = await stripe.customers.update(
                stripe_customer_id,
                {
                  invoice_settings: {
                    default_payment_method: payment_method_id,
                  },
                },
              );
              const subscriptionDetails = await transactionalEntityManager
                .createQueryBuilder()
                .update(SubscriptionDetails)
                .set({
                  payment_method_id: payment_method_id,
                  updated_by: decoded?.userId,
                  updated_on: moment.tz('UTC'),
                  updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
                })
                .where(`company_id = :company_id`, { company_id })
                .execute();

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
                is_admin: false,
                created_by: decoded?.userId,
                company_id: company_id,
              };
              await this.activityLogService.insertActivityLog(
                createActivityLogInput,
              );
            }
          }

          const subscriptionDetails = await transactionalEntityManager.findOne(
            SubscriptionDetails,
            {
              where: { company_id },
              relations: ['planDetails', 'pricingPlan'],
            },
          );

          const pricingDetails = await transactionalEntityManager.findOne(
            SubscriptionPricingPlan,
            {
              where: { price_id },
              relations: ['planDetails'],
            },
          );

          let couponDetail = null;

          if (coupon_id) {
            couponDetail = await transactionalEntityManager.findOne(
              StripeCoupons,
              {
                where: {
                  coupon_id,
                  coupon_status: 'Active',
                },
              },
            );
          }

          if (coupon_id && !couponDetail) {
            throw `Coupon detail not found`;
          }

          if (subscriptionDetails.planDetails.plan_type === 'Free') {
            const start_date = moment.tz('UTC');
            const expiryDate =
              pricingDetails.planDetails.trial_period > 0
                ? moment(start_date)
                    .add(pricingDetails.planDetails.trial_period, 'months')
                    .utc()
                : pricingDetails.bill_cycle === 'Month'
                  ? moment(start_date).add(1, 'months').utc()
                  : moment(start_date).add(1, 'years').utc();

            // Resolve the Australian 10% GST tax rate (exclusive) and
            // attach it to the new subscription so Stripe adds GST on
            // top of the headline plan price (e.g. $50/mo -> $55/mo
            // charged). Only applied to brand-new subscriptions created
            // here; existing subscriptions keep their original tax
            // configuration. Hardened: a null result indicates a Stripe
            // config / connectivity failure and must abort the upgrade
            // rather than silently creating a no-GST subscription
            // (Task #312).
            const gstTaxRateId = await this.getAuGstTaxRateId(
              stripe,
              isDemo,
              false,
            );
            if (!gstTaxRateId) {
              throw `Unable to resolve Australian GST tax rate in Stripe (isDemo=${isDemo}). Please retry; if the error persists, contact support.`;
            }

            // Create a subscription for the customer
            let subsciptionData: any = {
              customer: stripe_customer_id,
              items: [
                {
                  price: pricingDetails.stripe_price_id,
                  tax_rates: [gstTaxRateId],
                },
              ],
              expand: ['latest_invoice.payment_intent'],
              default_tax_rates: [gstTaxRateId],
            };

            if (pricingDetails.planDetails.trial_period > 0) {
              subsciptionData = {
                ...subsciptionData,
                trial_end: expiryDate.toDate(),
              };
            }

            if (couponDetail) {
              subsciptionData = {
                ...subsciptionData,
                coupon: couponDetail.stripe_coupon_id,
              };
            }

            const subscription =
              await stripe.subscriptions.create(subsciptionData);

            if (subscription && subscription.status) {
              let subscriptionStatus = await this.getSubscriptionStatus(
                subscription.status,
              );
              const updateSubscriptionDetails = await transactionalEntityManager
                .createQueryBuilder()
                .update(SubscriptionDetails)
                .set({
                  plan_id: pricingDetails.plan_id,
                  price_id: pricingDetails.price_id,
                  amount: pricingDetails.plan_price,
                  start_date: start_date,
                  expiry_date: expiryDate.toDate(),
                  status: subscriptionStatus,
                  stripe_subscription_id: subscription.id,
                  coupon_id: coupon_id ?? null,
                  trial_start: subscription.trial_start
                    ? moment.unix(subscription.trial_start).utc().toDate()
                    : subscription.trial_start,
                  trial_end: subscription.trial_end
                    ? moment.unix(subscription.trial_end).utc().toDate()
                    : subscription.trial_end,
                  canceled_at: subscription.canceled_at
                    ? moment.unix(subscription.canceled_at).utc().toDate()
                    : subscription.canceled_at,
                  signature: signature ?? subscriptionDetails?.signature,
                  signature_type:
                    signature_type ?? subscriptionDetails?.signature_type,
                  updated_by: decoded?.userId,
                  updated_on: moment.tz('UTC'),
                  updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
                })
                .where(`company_id = :company_id`, { company_id })
                .execute();

              if (couponDetail?.stripe_coupon_id) {
                const createAppliedCouponDetail =
                  await transactionalEntityManager.create(
                    CompanyCouponDetails,
                    {
                      company_id,
                      coupon_id,
                      applied_on: moment.tz('UTC'),
                    },
                  );

                await transactionalEntityManager.save(
                  CompanyCouponDetails,
                  createAppliedCouponDetail,
                );

                this.logger.log(
                  `Saved applied coupons for company subscription with details: ${createAppliedCouponDetail}`,
                );
              }

              if (subscriptionDetails.signature) {
                //Create activity log as soon a subscription is upgraded.
                const subscriptionPlanDetails =
                  await this.subscriptionPlanDetails.findOne({
                    where: { plan_id: pricingDetails.plan_id },
                    select: ['plan_name'],
                  });
                const createActivityLogInput: CreateActivityLogInput = {
                  event_template_id: 10,
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
                  is_admin: decoded?.isAdmin,
                  created_by: decoded?.userId,
                  company_id: company_id,
                };
                await this.activityLogService.insertActivityLog(
                  createActivityLogInput,
                );
              }

              //Generating link to view updated subscription plan.
              const planLink =
                `${process.env.LOG_BASE_URL}` +
                `${linkExtensions[3]}` +
                `?from=log`;
              const createActivityLogInput: CreateActivityLogInput = {
                event_template_id: 185,
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
                dynamic_values: {
                  planName: pricingDetails.planDetails.plan_name,
                  planLink,
                  companyName: companyDetails.company_name,
                  companyLink,
                },
                is_admin: false,
                created_by: decoded?.userId,
                company_id: company_id,
              };
              await this.activityLogService.insertActivityLog(
                createActivityLogInput,
              );
            }
          } else if (
            (subscriptionDetails.planDetails.plan_type === 'Paid' &&
              subscriptionDetails.pricingPlan.bill_cycle === 'Month') ||
            (subscriptionDetails.planDetails.plan_type === 'Paid' &&
              subscriptionDetails.pricingPlan.bill_cycle === 'Year')
          ) {
            if (
              subscriptionDetails.status === 'Cancelled' &&
              moment.tz('UTC').isBefore(moment(subscriptionDetails.expiry_date))
            )
              throw `Your current plan has been canceled. You'll be able to upgrade to a new plan once your current plan's billing period ends.`;

            // Retrieve the existing subscription
            const oldSubscription = await stripe.subscriptions.retrieve(
              subscriptionDetails.stripe_subscription_id,
            );

            // Update the subscription to use the yearly price
            const subscription = await stripe.subscriptions.update(
              subscriptionDetails.stripe_subscription_id,
              {
                items: [
                  {
                    id: oldSubscription.items.data[0].id,
                    price: pricingDetails.stripe_price_id,
                  },
                ],
                proration_behavior: 'always_invoice',
                ...(couponDetail && {
                  coupon: couponDetail.stripe_coupon_id,
                }),
              },
            );

            const start_date = moment.tz('UTC');

            const expiryDate =
              pricingDetails.planDetails.trial_period > 0
                ? moment(start_date)
                    .add(pricingDetails.planDetails.trial_period, 'months')
                    .utc()
                : pricingDetails.bill_cycle === 'Month'
                  ? moment(start_date).add(1, 'months').utc()
                  : moment(start_date).add(1, 'years').utc();

            if (subscription && subscription.status) {
              let subscriptionStatus = await this.getSubscriptionStatus(
                subscription.status,
              );

              const updateSubscriptionDetails = await transactionalEntityManager
                .createQueryBuilder()
                .update(SubscriptionDetails)
                .set({
                  plan_id: pricingDetails.plan_id,
                  price_id: pricingDetails.price_id,
                  amount: pricingDetails.plan_price,
                  start_date: start_date,
                  expiry_date: expiryDate.toDate(),
                  status: subscriptionStatus,
                  stripe_subscription_id: subscription.id,
                  coupon_id: coupon_id ?? null,
                  trial_start: subscription.trial_start
                    ? moment.unix(subscription.trial_start).utc().toDate()
                    : subscription.trial_start,
                  trial_end: subscription.trial_end
                    ? moment.unix(subscription.trial_end).utc().toDate()
                    : subscription.trial_end,
                  canceled_at: subscription.canceled_at
                    ? moment.unix(subscription.canceled_at).utc().toDate()
                    : subscription.canceled_at,
                  signature: signature ?? subscriptionDetails.signature,
                  signature_type:
                    signature_type ?? subscriptionDetails.signature_type,
                  updated_by: decoded?.userId,
                  updated_on: moment.tz('UTC'),
                  updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
                })
                .where(`company_id = :company_id`, { company_id })
                .execute();

              //Generating link to view updated subscription plan.
              const planLink =
                `${process.env.LOG_BASE_URL}` +
                `${linkExtensions[3]}` +
                `?from=log`;
              const createActivityLogInput: CreateActivityLogInput = {
                event_template_id: 32,
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
                dynamic_values: {
                  planName: pricingDetails.planDetails.plan_name,
                  planLink,
                  companyName: companyDetails.company_name,
                  companyLink,
                },
                is_admin: false,
                created_by: decoded?.userId,
                company_id: company_id,
              };
              await this.activityLogService.insertActivityLog(
                createActivityLogInput,
              );

              if (couponDetail?.stripe_coupon_id) {
                const createAppliedCouponDetail =
                  await transactionalEntityManager.create(
                    CompanyCouponDetails,
                    {
                      company_id,
                      coupon_id,
                      applied_on: moment.tz('UTC'),
                    },
                  );

                await transactionalEntityManager.save(
                  CompanyCouponDetails,
                  createAppliedCouponDetail,
                );

                this.logger.log(
                  `Saved applied coupons for company subscription with details: ${createAppliedCouponDetail}`,
                );
              }
            }

            return await transactionalEntityManager.findOne(
              SubscriptionDetails,
              {
                where: { company_id },
              },
            );
          } else {
            throw `You are already subscribed to the highest available plan. Upgrade is not possible at this time.`;
          }

          const subscriptionResponse = await transactionalEntityManager.findOne(
            SubscriptionDetails,
            {
              where: { company_id },
            },
          );

          const subscriptionDetail =
            await this.getSubscriptionDetailsByCompanyId(company_id);
          const subscriptionItemForRestriction =
            subscriptionDetail &&
            subscriptionDetail?.plan_items &&
            subscriptionDetail?.plan_items?.length > 0
              ? subscriptionDetail?.plan_items?.filter(
                  (item) => item?.item_name === 'Xero Integration',
                )
              : [];
          if (
            subscriptionDetail?.is_free_plan_eligible ||
            (subscriptionItemForRestriction &&
              subscriptionItemForRestriction?.length > 0 &&
              subscriptionItemForRestriction[0]?.limit_value == 'true')
          ) {
            const activeSubscriptionDetails =
              await transactionalEntityManager.findOne(SubscriptionDetails, {
                where: {
                  company_id,
                  status: In(['Subscribed']),
                  is_free_plan_eligible: false,
                  expiry_date: MoreThan(new Date()),
                },
                select: [
                  'id',
                  'subscription_id',
                  'company_id',
                  'expiry_date',
                  'amount',
                  'status',
                ],
                order: { company_id: 'DESC' },
              });

            this.logger.log(`activeSubscriptionDetails: ${JSON.stringify(activeSubscriptionDetails)}`);

            if (activeSubscriptionDetails) {
              const activeIntegrations =
                await transactionalEntityManager.findOne(IntegrationDetails, {
                  where: {
                    company_id,
                    integration_status: 'Inactive',
                    previous_status: Not(
                      In(['Inactive', 'Deleted - archived']),
                    ),
                  },
                  order: { company_id: 'DESC' },
                });

              this.logger.log(`activeIntegrations: ${JSON.stringify(activeIntegrations)}`);
              if (activeIntegrations) {
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
                  .where(`integration_id =:integration_id`, {
                    integration_id: activeIntegrations?.integration_id,
                  })
                  .execute();

                this.logger.log(`updateIntegrationResult: ${JSON.stringify(updateIntegrationResult)}`);
                this.logger.log('Integration updated for active subscriptions!');
              }
            }
          }

          return subscriptionResponse;
        },
      );
    } catch (error) {
      const errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Error while upgrading the subscription: ${errorMessage}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        return error;
      });
      throw errMsg;
    }
  }

  async cancelSubscriptionForUser(
    company_id: number,
    decoded: any,
    cancellation_reason: string,
  ) {
    try {
      return await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          const subscriptionDetails = await transactionalEntityManager.findOne(
            SubscriptionDetails,
            {
              where: { company_id },
            },
          );

          const companyData = await transactionalEntityManager.findOne(
            CompanyDetails,
            {
              where: { company_id },
            },
          );

          if (!subscriptionDetails) throw `Subscription details not found.`;

          const isDemo = await this.isCompanyDemo(company_id);
          const stripe = getStripeInstance(isDemo);

          const planDetails = await this.subscriptionPlanDetails.findOne({
            where: { plan_id: subscriptionDetails.plan_id },
            select: ['plan_name'],
          });

          let subscription;
          if (
            (subscriptionDetails.trial_end &&
              moment
                .unix(subscriptionDetails.trial_end)
                .isBefore(moment.tz('UTC'))) ||
            !subscriptionDetails.trial_end
          ) {
            // If the trial period hasn't ended, cancel the subscription at the end of the current billing period
            subscription = await stripe.subscriptions.update(
              subscriptionDetails.stripe_subscription_id,
              {
                cancel_at_period_end: true, // This will cancel the subscription at the end of the current billing period
                // no proration_behavior is needed because you're not issuing any prorations or refunds
              },
            );
          } else {
            // If the trial period has ended, cancel the subscription immediately
            subscription = await stripe.subscriptions.cancel(
              subscriptionDetails.stripe_subscription_id,
            );
          }
          if (subscription && subscription.status) {
            let subscriptionStatus = await this.getSubscriptionStatus(
              subscription.status,
            );
            const subscriptionPlanDetails = await transactionalEntityManager
              .createQueryBuilder(SubscriptionPlanDetails, 'pd')
              .select([
                'pd.id as id',
                'pd.plan_id as plan_id',
                'pd.plan_type as plan_type',
                'pd.plan_status as plan_status',
                'pp.price_id as price_id',
                'pp.plan_price as price',
                'pd.plan_name as plan_name',
              ])
              .leftJoin(
                SubscriptionPricingPlan,
                'pp',
                `pd.plan_id = pp.plan_id AND pp.id::varchar = ANY(pd.associated_price_ids) AND pp.is_active = true`,
              )
              .where(`pd.plan_type = 'Free' and pd.plan_status = 'Active' and pd.is_sandbox = :isSandbox`, { isSandbox: isDemo })
              .getRawOne();

            if (!subscriptionPlanDetails)
              throw `Your subscription plan has been cancelled. Please contact the Paytrade administrator to request access to the Free plan.`;

            if (
              subscription.cancel_at_period_end &&
              subscription.status === 'canceled'
            ) {
              subscriptionDetails.plan_id = subscriptionPlanDetails.plan_id;
              subscriptionDetails.price_id = subscriptionPlanDetails.price_id;
              subscriptionDetails.amount = subscriptionPlanDetails.price;
              subscriptionDetails.start_date = moment.tz('UTC');
              subscriptionDetails.expiry_date = null;
              subscriptionStatus = 'Unsubscribed';
            } else if (
              subscription.cancel_at_period_end &&
              subscription.status === 'active'
            ) {
              subscriptionStatus = 'Cancelled';
            }
            subscriptionDetails.canceled_at = subscription.canceled_at
              ? moment.unix(subscription.canceled_at).utc().toDate()
              : subscription.canceled_at;
            subscriptionDetails.status = subscriptionStatus;
            subscriptionDetails.trial_start = subscription.trial_start
              ? moment.unix(subscription.trial_start).utc().toDate()
              : subscription.trial_start;
            subscriptionDetails.trial_end = subscription.trial_end
              ? moment.unix(subscription.trial_end).utc().toDate()
              : subscription.trial_end;
            subscriptionDetails.cancellation_reason = cancellation_reason;
            subscriptionDetails.updated_by = decoded?.userId;
            subscriptionDetails.updated_on = moment.tz('UTC');
            subscriptionDetails.updated_group = decoded?.isAdmin
              ? 'ADMIN'
              : 'USER';

            if (decoded?.isAdmin) {
              //Generating company link.
              const companyLink =
                `${process.env.LOG_BASE_URL}` +
                `${linkExtensions[20]}` +
                `${companyData.company_id}` +
                `?from=log`;

              const createActivityLogInput: CreateActivityLogInput = {
                event_template_id: 183,
                admin_id: decoded?.userId,
                company_id: company_id,
                dynamic_values: {
                  planType:
                    subscriptionPlanDetails.plan_type == 'Month'
                      ? 'Monthly'
                      : 'Yearly',
                  companyName: companyData.company_name,
                  companyLink: companyLink,
                },
                is_admin: decoded?.isAdmin,
                created_by: decoded?.userId,
              };
              await this.activityLogService.insertActivityLog(
                createActivityLogInput,
              );
            } else {
              const createActivityLogInput: CreateActivityLogInput = {
                event_template_id: 33,
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
                dynamic_values: {
                  planType:
                    subscriptionPlanDetails.plan_type == 'Month'
                      ? 'Monthly'
                      : 'Yearly',
                },
                is_admin: decoded?.isAdmin,
                created_by: decoded?.userId,
              };
              await this.activityLogService.insertActivityLog(
                createActivityLogInput,
              );
            }
          }

          const subscriptionResponse = await transactionalEntityManager.save(
            SubscriptionDetails,
            subscriptionDetails,
          );

          const expiredSubscriptionDetails =
            await transactionalEntityManager.findOne(SubscriptionDetails, {
              where: {
                company_id,
                status: In(['Subscribed', 'Cancelled', 'Unsubscribed']),
                is_free_plan_eligible: false,
                expiry_date: LessThanOrEqual(new Date()),
              },
              select: [
                'id',
                'subscription_id',
                'company_id',
                'expiry_date',
                'amount',
                'status',
              ],
              order: { company_id: 'DESC' },
            });

          this.logger.log(`expiredSubscriptionDetails: ${JSON.stringify(expiredSubscriptionDetails)}`);

          if (expiredSubscriptionDetails) {
            const expireIntegrations = await transactionalEntityManager.findOne(
              IntegrationDetails,
              {
                where: {
                  company_id,
                  integration_status: Not(
                    In(['Inactive', 'Deleted - archived']),
                  ),
                },
                order: { company_id: 'DESC' },
              },
            );

            this.logger.log(`expireIntegrations: ${JSON.stringify(expireIntegrations)}`);
            if (expireIntegrations) {
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
                .where(`integration_id =:integration_id`, {
                  integration_id: expireIntegrations?.integration_id,
                })
                .execute();

              this.logger.log(`updateIntegrationResult: ${JSON.stringify(updateIntegrationResult)}`);
              this.logger.log('Integration updated for expired subscriptions!');
            }
          }
          return subscriptionResponse;
        },
      );
    } catch (error) {
      const errorMessage = error.message ? error.message : error;
      this.logger.error(`Error while cancelling subscription: ${errorMessage}`);
      const errMsg = await handleError(error).catch((error) => {
        return error;
      });
      throw errMsg;
    }
  }

  async subscriptionUpdateByAdmin(company_id: number, decoded) {
    try {
      return await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          const subscriptionDetails = await transactionalEntityManager.findOne(
            SubscriptionDetails,
            {
              where: { company_id },
              relations: ['pricingPlan'],
            },
          );

          if (!subscriptionDetails) throw `Subscription details not found.`;

          const transactionDetails = await transactionalEntityManager.findOne(
            SubscriptionTransaction,
            {
              where: {
                subscription_id: subscriptionDetails.subscription_id,
                stripe_subscription_id:
                  subscriptionDetails.stripe_subscription_id,
                status: 'paid',
                attempt_count: MoreThan(0),
              },
            },
          );

          if (!transactionDetails)
            throw `We couldn't find any transactions for the subscription. If you have any concerns, please reach out to Paytrade support for assistance.`;

          const start_date = moment(subscriptionDetails.expiry_date)
            .add(1, 'days')
            .utc();
          const expiryDate =
            subscriptionDetails.pricingPlan.bill_cycle === 'Month'
              ? moment(start_date).add(1, 'months').utc()
              : moment(start_date).add(1, 'years').utc();

          const updateSubscriptionDetails = await transactionalEntityManager
            .createQueryBuilder()
            .update(SubscriptionDetails)
            .set({
              start_date: start_date,
              expiry_date: expiryDate.toDate(),
              status: 'Subscribed',
              updated_by: decoded?.userId,
              updated_on: moment.tz('UTC'),
              updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
            })
            .where(`company_id = :company_id`, {
              company_id,
            })
            .execute();

          return await transactionalEntityManager.findOne(SubscriptionDetails, {
            where: { company_id },
          });
        },
      );
    } catch (error) {
      const errorMessage = error.message ? error.message : error;
      this.logger.error(`Error while cancelling subscription: ${errorMessage}`);
      const errMsg = await handleError(error).catch((error) => {
        return error;
      });
      throw errMsg;
    }
  }

  async getAllCardDetailsByCompanyId(company_id: number) {
    try {
      const subscriptionDetails = await this.subscriptionDetails.findOne({
        where: { company_id },
      });

      if (!subscriptionDetails) throw `Subscription details not found.`;

      if (!subscriptionDetails.stripe_customer_id)
        throw `Please add a card to proceed with the subscription.`;

      const isDemo = await this.isCompanyDemo(company_id);
      const stripe = getStripeInstance(isDemo);

      const customer = await stripe.customers.retrieve(
        subscriptionDetails.stripe_customer_id,
      );
      const defaultPaymentMethod =
        (customer as any).invoice_settings?.default_payment_method;

      const paymentMethods = await stripe.paymentMethods.list({
        customer: subscriptionDetails.stripe_customer_id,
        type: 'card',
      });
      let cardDetailsArray = [];
      if (paymentMethods && paymentMethods.data) {
        paymentMethods.data.forEach((element) => {
          const cardDetails = {
            customer_id: subscriptionDetails.stripe_customer_id,
            name_on_card: element.billing_details.name,
            payment_method_id: element.id,
            card_type: element.card.brand,
            last_four_digits: element.card.last4,
            expiry_month: element.card.exp_month,
            expiry_year: element.card.exp_year,
            is_default:
              defaultPaymentMethod && defaultPaymentMethod === element.id
                ? true
                : false,
          };
          cardDetailsArray.push(cardDetails);
        });
      }
      return cardDetailsArray;
    } catch (error) {
      const errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Error while fetching list of all card details: ${errorMessage}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        return error;
      });
      throw errMsg;
    }
  }

  async getCardDetailsByCompanyId(company_id: number) {
    try {
      const subscriptionDetails = await this.subscriptionDetails.findOne({
        where: { company_id },
      });

      if (!subscriptionDetails) throw `Subscription details not found.`;

      if (!subscriptionDetails.payment_method_id)
        throw `Please add a card to proceed with the subscription.`;

      const isDemo = await this.isCompanyDemo(company_id);
      const stripe = getStripeInstance(isDemo);

      const customer = await stripe.customers.retrieve(
        subscriptionDetails.stripe_customer_id,
      );
      const defaultPaymentMethod =
        (customer as any).invoice_settings?.default_payment_method;

      const paymentMethod = await stripe.paymentMethods.retrieve(
        subscriptionDetails.payment_method_id,
      );
      const cardDetails = {
        customer_id: subscriptionDetails.stripe_customer_id,
        name_on_card: paymentMethod.billing_details.name,
        payment_method_id: paymentMethod.id,
        card_type: paymentMethod.card.brand,
        last_four_digits: paymentMethod.card.last4,
        expiry_month: paymentMethod.card.exp_month,
        expiry_year: paymentMethod.card.exp_year,
        is_default:
          defaultPaymentMethod && defaultPaymentMethod === paymentMethod.id
            ? true
            : false,
      };
      return cardDetails;
    } catch (error) {
      const errorMessage = error.message ? error.message : error;
      this.logger.error(`Error while fetching card details: ${errorMessage}`);
      const errMsg = await handleError(error).catch((error) => {
        return error;
      });
      throw errMsg;
    }
  }

  async setAsDefaultByPaymentMethodId(
    customer_id: string,
    payment_method_id: string,
  ) {
    try {
      const isDemo = await this.isCompanyDemoByStripeCustomer(customer_id);
      const stripe = getStripeInstance(isDemo);

      const updatePaymentMethodWithCustomer =
        await stripe.paymentMethods.attach(payment_method_id, {
          customer: customer_id,
        });
      const updatePaymentMethodAsDefault = await stripe.customers.update(
        customer_id,
        {
          invoice_settings: {
            default_payment_method: payment_method_id,
          },
        },
      );
      return updatePaymentMethodAsDefault;
    } catch (error) {
      const errorMessage = error.message ? error.message : error;
      this.logger.error(`Error while fetching card details: ${errorMessage}`);
      const errMsg = await handleError(error).catch((error) => {
        return error;
      });
      throw errMsg;
    }
  }

  async associatePaymentMethodToCustomer(
    company_id: number,
    payment_method_id: string,
  ) {
    try {
      const subscriptionDetails = await this.subscriptionDetails.findOne({
        where: { company_id },
      });
      const isDemo = await this.isCompanyDemo(company_id);
      const stripe = getStripeInstance(isDemo);

      if (!subscriptionDetails) throw `Subscription details not found.`;

      if (!subscriptionDetails.stripe_customer_id)
        throw `Customer Id not found.`;

      const associatePaymentMethodToCustomer =
        await stripe.paymentMethods.attach(payment_method_id, {
          customer: subscriptionDetails.stripe_customer_id,
        });

      return associatePaymentMethodToCustomer;
    } catch (error) {
      const errorMessage = error.message ? error.message : error;
      this.logger.error(`Error while fetching card details: ${errorMessage}`);
      const errMsg = await handleError(error).catch((error) => {
        return error;
      });
      throw errMsg;
    }
  }

  async updatePaymentMethodForSubscription(
    decoded,
    subscription_id: number,
    payment_method_id: string,
  ) {
    try {
      const subscriptionDetails = await this.subscriptionDetails.findOne({
        where: { subscription_id },
      });

      if (!subscriptionDetails) throw `Subscription details not found.`;

      const isDemo = await this.isCompanyDemo(subscriptionDetails.company_id);
      const stripe = getStripeInstance(isDemo);

      const updatePaymentMethodWithCustomer =
        await stripe.paymentMethods.attach(payment_method_id, {
          customer: subscriptionDetails.stripe_customer_id,
        });
      const updatePaymentMethodAsDefault = await stripe.customers.update(
        subscriptionDetails.stripe_customer_id,
        {
          invoice_settings: {
            default_payment_method: payment_method_id,
          },
        },
      );

      const updateSubscription = await stripe.subscriptions.update(
        subscriptionDetails.stripe_subscription_id,
        {
          default_payment_method: payment_method_id,
        },
      );

      subscriptionDetails.payment_method_id = payment_method_id;
      subscriptionDetails.updated_by = decoded?.userId;
      subscriptionDetails.updated_on = moment.tz('UTC');
      subscriptionDetails.updated_group = decoded?.isAdmin ? 'ADMIN' : 'USER';
      return await this.subscriptionDetails.save(subscriptionDetails);
    } catch (error) {
      const errorMessage = error.message ? error.message : error;
      this.logger.error(`Error while fetching card details: ${errorMessage}`);
      const errMsg = await handleError(error).catch((error) => {
        return error;
      });
      throw errMsg;
    }
  }

  async deleteCardByPaymentMethodId(payment_method_id: string) {
    try {
      const liveStripe = getStripeInstance(false);
      let paymentMethod;
      let isDemo = false;
      try {
        paymentMethod = await liveStripe.paymentMethods.retrieve(payment_method_id);
      } catch (e) {
        const testStripe = getStripeInstance(true);
        paymentMethod = await testStripe.paymentMethods.retrieve(payment_method_id);
        isDemo = true;
      }
      const stripe = getStripeInstance(isDemo);

      const customer = await stripe.customers.retrieve(paymentMethod.customer as string);
      const defaultPaymentMethod =
        (customer as any).invoice_settings?.default_payment_method;

      if (defaultPaymentMethod === payment_method_id) {
        throw 'Payment method is the default one and cannot be deleted.';
      }

      return await stripe.paymentMethods.detach(payment_method_id);
    } catch (error) {
      const errorMessage = error.message ? error.message : error;
      this.logger.error(`Error while deleting card details: ${errorMessage}`);
      const errMsg = await handleError(error).catch((error) => {
        return error;
      });
      throw errMsg;
    }
  }

  async getPaymentHistoryByCompanyId(data: GetPaymentHistoryInput, timezone) {
    const queryBuilder = await this.subscriptionTransaction
      .createQueryBuilder('payment')
      .select('payment.id', 'id')
      .addSelect('payment.customer_id', 'customer_id')
      .addSelect('payment.stripe_subscription_id', 'stripe_subscription_id')
      .addSelect('payment.subscription_id', 'subscription_id')
      .addSelect('payment.payment_intent', 'payment_intent')
      .addSelect('payment.invoice_id', 'invoice_id')
      .addSelect('payment.invoice_number', 'invoice_number')
      .addSelect('payment.amount_paid', 'amount_paid')
      .addSelect('payment.effective_at', 'effective_at')
      .addSelect('payment.paid_at', 'paid_at')
      .addSelect('payment.status', 'status')
      .addSelect('payment.attempt_count', 'attempt_count')
      .addSelect('payment.attempted', 'attempted')
      .addSelect('payment.next_payment_attempt', 'next_payment_attempt')
      .addSelect('payment.invoice_pdf', 'invoice_pdf')
      .addSelect('payment.start_date', 'start_date')
      .addSelect('payment.expiry_date', 'expiry_date')
      .addSelect('payment.payment_method', 'payment_method')
      .addSelect('subscription.company_id', 'company_id')
      .addSelect('subscription.is_gst_inclusive', 'is_gst_inclusive')
      .addSelect('company.company_name', 'company_name')
      .leftJoin('payment.subscriptionDetails', 'subscription')
      .leftJoin('payment.planDetails', 'planDetails')
      .leftJoin(
        CompanyDetails,
        'company',
        'subscription.company_id = company.company_id',
      );

    // Hide sandbox-plan transactions from the live Billing screen.
    // Sandbox subscriptions write to the same `subscription_transactions`
    // table but reference a `subscription_plan_details` row whose
    // `is_sandbox = true` (e.g. the $300 demo invoices observed under
    // company_id=1012). Filter them out unless the caller explicitly
    // asks for sandbox via `data.is_sandbox = true`.
    if (data.is_sandbox === true) {
      queryBuilder.andWhere('planDetails.is_sandbox = :sb', { sb: true });
    } else {
      queryBuilder.andWhere(
        '(planDetails.is_sandbox IS NULL OR planDetails.is_sandbox = false)',
      );
    }

    if (data.company_id) {
      queryBuilder.andWhere(`subscription.company_id = :companyId`, {
        companyId: data.company_id,
      });
    }

    if (data.status) {
      queryBuilder.andWhere(`payment.status = :status`, {
        status: data.status,
      });
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
      }
      queryBuilder.andWhere(
        'payment.paid_at BETWEEN :start_date AND :end_date',
        {
          start_date: startDate,
          end_date: endDate,
        },
      );
    }

    const sorting_order = data.sorting_order ? data.sorting_order : 'DESC';

    if (!data.sorting_field) {
      queryBuilder.distinct(true).orderBy({ 'payment.paid_at': 'DESC' });
    }
    if (data.sorting_field) {
      switch (data.sorting_field) {
        case 'paid_at':
          {
            queryBuilder
              .distinct(true)
              .orderBy('payment.paid_at', sorting_order);
          }
          break;
        case 'invoice_number':
          {
            queryBuilder
              .distinct(true)
              .orderBy({ 'payment.invoice_number': sorting_order });
          }
          break;
        case 'status':
          {
            queryBuilder
              .distinct(true)
              .orderBy({ 'LOWER(payment.status)': sorting_order });
          }
          break;
        case 'payment_method':
          {
            queryBuilder
              .distinct(true)
              .orderBy({ 'payment.payment_method': sorting_order });
          }
          break;
        case 'start_date':
          {
            queryBuilder
              .distinct(true)
              .orderBy({ 'payment.start_date': sorting_order });
          }
          break;
        case 'amount_paid':
          {
            queryBuilder
              .distinct(true)
              .orderBy({ 'payment.amount_paid': sorting_order });
          }
          break;
        case 'plan_status':
          {
            queryBuilder.distinct(true).orderBy({
              'LOWER(CAST(pd.plan_status AS text))': sorting_order,
            });
          }
          break;
      }
    }

    const [rawResults, totalCount] = await Promise.all([
      queryBuilder.getRawMany(), //skip and take not working with getRawMany()
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

    // Task #312 — derive GST split per row. Mathematically identical
    // for inclusive vs exclusive 10% GST: gst = total / 11. The
    // `is_gst_inclusive` flag only changes how the UI labels it
    // ("Includes $X GST" vs "Plus $X GST"). amount_paid is then
    // formatted to the currency string the grid expects.
    results?.forEach((element) => {
      const rawAmount = Number(element.amount_paid) || 0;
      const gst = Math.round((rawAmount / 11) * 100) / 100;
      const exGst = Math.round((rawAmount - gst) * 100) / 100;
      element.gst_amount = gst;
      element.total_ex_gst = exGst;
      element.is_gst_inclusive = element.is_gst_inclusive === true;
      element.amount_paid = formatCurrency(element.amount_paid);
    });

    return {
      total_count: totalCount,
      payment_history: results,
    };
  }

  /**
   * Resolve the owning company_id for a billing-history row so the resolver
   * can authorize the caller before any Stripe call is made.
   */
  async getCompanyIdForTransaction(
    transactionId: string,
  ): Promise<number | null> {
    if (!transactionId) return null;
    const row = await this.subscriptionTransaction
      .createQueryBuilder('payment')
      .leftJoin('payment.subscriptionDetails', 'subscription')
      .select('subscription.company_id', 'company_id')
      .where('payment.id = :id', { id: transactionId })
      .getRawOne();
    return row?.company_id ?? null;
  }

  /**
   * On-demand refresh of a billing-history row's Stripe receipt URL.
   *
   * Stripe's `hosted_invoice_url` / `invoice_pdf` URLs are signed/expiring,
   * so the values cached on `subscription_transaction` at webhook time go
   * stale (the user-visible symptom: clicking "Export to pdf" eventually
   * returns a Stripe error page). We re-fetch the invoice from Stripe each
   * time the user requests a download, persist the fresh values back into
   * the cached columns (so diagnostics keep working), and return them.
   *
   * Sandbox-plan transactions are excluded from the live Billing screen
   * (see `getPaymentHistoryByCompanyId`); we still detect `is_sandbox`
   * here so admin sandbox views resolve against the test Stripe account.
   */
  async refreshBillingReceiptUrl(transactionId: string): Promise<{
    hosted_invoice_url: string | null;
    invoice_pdf: string | null;
    invoice_id: string | null;
    invoice_number: string | null;
  }> {
    const row = await this.subscriptionTransaction
      .createQueryBuilder('payment')
      .leftJoin('payment.planDetails', 'planDetails')
      .select('payment.id', 'id')
      .addSelect('payment.invoice_id', 'invoice_id')
      .addSelect('payment.invoice_number', 'invoice_number')
      .addSelect('payment.hosted_invoice_url', 'hosted_invoice_url')
      .addSelect('payment.invoice_pdf', 'invoice_pdf')
      .addSelect('planDetails.is_sandbox', 'is_sandbox')
      .where('payment.id = :id', { id: transactionId })
      .getRawOne();

    if (!row) {
      throw new Error('Receipt not found for the requested billing history row.');
    }
    if (!row.invoice_id) {
      throw new Error(
        'This billing-history row has no Stripe invoice id, so the receipt cannot be refreshed.',
      );
    }

    const isDemo = row.is_sandbox === true;
    const stripe = getStripeInstance(isDemo);

    let hosted_invoice_url: string | null = null;
    let invoice_pdf: string | null = null;
    let invoice_number: string | null = row.invoice_number ?? null;

    try {
      const invoice = await stripe.invoices.retrieve(row.invoice_id);
      hosted_invoice_url = invoice?.hosted_invoice_url ?? null;
      invoice_pdf = invoice?.invoice_pdf ?? null;
      invoice_number = invoice?.number ?? invoice_number;
    } catch (err: any) {
      this.logger.error(
        `Stripe refresh of invoice ${row.invoice_id} failed: ${err?.message || err}`,
      );
      // Fall back to the cached URL only when Stripe itself is unreachable.
      // For "resource_missing" / 404 we surface a clean error so the UI can
      // tell the user the receipt no longer exists in Stripe.
      const code = err?.code || err?.raw?.code;
      if (code === 'resource_missing' || err?.statusCode === 404) {
        throw new Error(
          'This receipt is no longer available in Stripe and cannot be downloaded.',
        );
      }
      hosted_invoice_url = row.hosted_invoice_url ?? null;
      invoice_pdf = row.invoice_pdf ?? null;
    }

    // Persist the fresh values so diagnostics / older queries see the
    // latest URL too. Treat write failures as non-fatal — the user still
    // gets their link.
    if (hosted_invoice_url || invoice_pdf) {
      try {
        await this.subscriptionTransaction
          .createQueryBuilder()
          .update(SubscriptionTransaction)
          .set({
            hosted_invoice_url: hosted_invoice_url ?? undefined,
            invoice_pdf: invoice_pdf ?? undefined,
          })
          .where('id = :id', { id: row.id })
          .execute();
      } catch (writeErr: any) {
        this.logger.error(
          `Failed to cache refreshed Stripe URLs for transaction ${row.id}: ${writeErr?.message || writeErr}`,
        );
      }
    }

    return {
      hosted_invoice_url,
      invoice_pdf,
      invoice_id: row.invoice_id,
      invoice_number,
    };
  }

  async getSubscriptionDetailsByCompanyId(company_id: number) {
    const result = await this.subscriptionDetails
      .createQueryBuilder('sd')
      .select('sd.id', 'id')
      .addSelect('sd.subscription_id', 'subscription_id')
      .addSelect('sd.company_id', 'company_id')
      .addSelect('company.company_name', 'company_name')
      .addSelect('sd.plan_id', 'plan_id')
      .addSelect('sd.price_id', 'price_id')
      .addSelect('sd.amount', 'amount')
      .addSelect('sd.start_date', 'start_date')
      .addSelect('sd.expiry_date', 'expiry_date')
      .addSelect('sd.status', 'status')
      .addSelect('sd.stripe_customer_id', 'stripe_customer_id')
      .addSelect('sd.payment_method_id', 'payment_method_id')
      .addSelect('sd.stripe_subscription_id', 'stripe_subscription_id')
      .addSelect('sd.trial_start', 'trial_start')
      .addSelect('sd.trial_end', 'trial_end')
      .addSelect('sd.canceled_at', 'canceled_at')
      .addSelect('sd.signature', 'signature')
      .addSelect('sd.signature_type', 'signature_type')
      .addSelect(
        `CASE 
            WHEN sd.is_free_plan_eligible = 'true' THEN 'Free Premium'
            ELSE plan.plan_name
          END
          `,
        'plan_name',
      )
      .addSelect('plan.plan_type', 'plan_type')
      .addSelect('plan.plan_status', 'plan_status')
      .addSelect('plan.trial_period', 'trial_period')
      .addSelect('plan.monthly_ai_credit', 'monthly_ai_credit')
      .addSelect('pricing.bill_cycle', 'bill_cycle')
      .addSelect('pi.plan_items', 'plan_items')
      .addSelect('coupon.coupon_name', 'coupon_name')
      .addSelect('coupon.percent_off', 'percent_off')
      .addSelect('coupon.duration', 'duration')
      .addSelect('coupon.duration_in_months', 'duration_in_months')
      .addSelect('coupon.coupon_status', 'coupon_status')
      .addSelect('coupon.coupon_id', 'coupon_id')
      .addSelect('sd.is_free_plan_eligible', 'is_free_plan_eligible')
      .addSelect('sd.free_plan_reason', 'free_plan_reason')
      // .distinct(true)
      .leftJoin('sd.planDetails', 'plan')
      .leftJoin('sd.pricingPlan', 'pricing')
      .leftJoin('sd.companyDetails', 'company')
      .leftJoin('sd.coupon', 'coupon')
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
        'sd.plan_id = pi.plan_id and plan.plan_id = pi.plan_id',
      )
      .where(`sd.company_id = :companyId`, {
        companyId: company_id,
      })
      .getRawOne();

    let cardDetails = {
      name_on_card: null,
      card_type: null,
      last_four_digits: null,
      expiry_month: null,
      expiry_year: null,
      is_default: null,
    };
    if (result.stripe_customer_id) {
      const isDemo = await this.isCompanyDemo(company_id);
      const stripe = getStripeInstance(isDemo);

      const customer = await stripe.customers.retrieve(
        result.stripe_customer_id,
      );
      const defaultPaymentMethod =
        (customer as any).invoice_settings?.default_payment_method;

      if (result.payment_method_id) {
        const paymentMethod = await stripe.paymentMethods.retrieve(
          result.payment_method_id,
        );

        cardDetails = {
          name_on_card: paymentMethod.billing_details.name,
          card_type: paymentMethod.card.brand,
          last_four_digits: paymentMethod.card.last4,
          expiry_month: paymentMethod.card.exp_month,
          expiry_year: paymentMethod.card.exp_year,
          is_default:
            defaultPaymentMethod && defaultPaymentMethod === paymentMethod.id
              ? true
              : false,
        };
      }
    }

    const upgradePlans = await this.subscriptionPricingPlan
      .createQueryBuilder('pp')
      .select('pp.id', 'id')
      .addSelect('pp.price_id', 'price_id')
      .addSelect('pp.plan_id', 'plan_id')
      .addSelect('pp.bill_cycle', 'bill_cycle')
      .addSelect('pp.plan_price', 'plan_price')
      .addSelect('pp.is_active', 'is_active')
      .distinct(true)
      .leftJoin('pp.planDetails', 'plan')
      .where(`plan.plan_type = 'Paid' AND plan.plan_status = 'Active'`)
      .andWhere(`pp.plan_price > :planPrice`, { planPrice: result.amount })
      .orderBy({ 'pp.plan_price': 'DESC' })
      .getRawMany();

    const hasUpgradePlans =
      upgradePlans && upgradePlans.length > 0 ? true : false;

    const pricingPlans = await this.subscriptionPricingPlan
      .createQueryBuilder('pp')
      .select('pp.id', 'id')
      .addSelect('pp.price_id', 'price_id')
      .addSelect('pp.plan_price', 'plan_price')
      .distinct(true)
      .leftJoin('pp.planDetails', 'plan')
      .where(
        `plan.plan_type = 'Paid' AND plan.plan_status = 'Active' 
          AND pp.bill_cycle = 'Year' AND pp.is_active = true`,
      )
      .andWhere(`pp.plan_id = :plan_id`, { plan_id: result.plan_id })
      .andWhere(`pp.price_id <> :priceId`, { priceId: result.price_id })
      .getRawOne();

    let pricingData = {
      has_annual_billing: false,
      annual_price_id: null,
      annual_price_amount: null,
      unformatted_annual_price_amount: null,
    };

    if (pricingPlans && pricingPlans.price_id) {
      pricingData = {
        has_annual_billing: true,
        annual_price_id: pricingPlans.price_id,
        annual_price_amount: formatCurrency(pricingPlans.plan_price),
        unformatted_annual_price_amount: pricingPlans.plan_price,
      };
    }

    result.amount = formatCurrency(result.amount);

    const isDemo = await this.isCompanyDemo(company_id);

    return {
      ...result,
      ...cardDetails,
      ...pricingData,
      has_upgrade_plans: hasUpgradePlans,
      is_demo: isDemo,
    };
  }

  async getSubscriptionDetailsByCustomerId(stripe_customer_id: string) {
    try {
      const subscriptionDetails = await this.subscriptionDetails.findOne({
        where: { stripe_customer_id },
      });

      if (!subscriptionDetails) throw `Subscription details not found.`;
      return subscriptionDetails;
    } catch (error) {
      this.logger.error(`Error while fetching subscription details: ${error}`);
      throw error;
    }
  }

  async getSubscriptionDetailsBySubscriptionId(subscription_id: number) {
    try {
      const subscriptionDetails = await this.subscriptionDetails.findOne({
        where: { subscription_id },
      });

      if (!subscriptionDetails) throw `Subscription details not found.`;
      return subscriptionDetails;
    } catch (error) {
      this.logger.error(`Error while fetching subscription details: ${error}`);
      throw error;
    }
  }

  async getSubscriptionStatus(status): Promise<any> {
    return new Promise(async (resolve, reject) => {
      let subscriptionStatus = 'Unsubscribed';
      switch (status) {
        case 'active':
          {
            subscriptionStatus = 'Subscribed';
          }
          break;
        case 'trialing':
          {
            subscriptionStatus = 'Under Trial';
          }
          break;
        case 'canceled':
          {
            subscriptionStatus = 'Cancelled';
          }
          break;
        case 'inactive':
          {
            subscriptionStatus = 'Unsubscribed';
          }
          break;
        case 'deleted':
          {
            subscriptionStatus = 'Deleted';
          }
          break;
        case 'past_due':
          {
            subscriptionStatus = 'Past Due';
          }
          break;
      }
      resolve(subscriptionStatus);
    });
  }
}
