import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { SubscriptionTransaction } from 'src/entities/subscription-transactions.entity';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { SubscriptionPlanDetails } from 'src/entities/subscription-plan-details.entity';
import { SubscriptionPricingPlan } from 'src/entities/subscription-pricing-plan.entity';
import { PaymentGatewayService } from '../payment-gateway/payment-gateway.service';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Injectable()
export class StripeWebhookService {
  private stripe: Stripe;
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(SubscriptionTransaction)
    private subscriptionTransaction: Repository<SubscriptionTransaction>,
    @InjectRepository(SubscriptionDetails)
    private subscriptionDetails: Repository<SubscriptionDetails>,
    @InjectRepository(SubscriptionPlanDetails)
    private subscriptionPlanDetails: Repository<SubscriptionPlanDetails>,
    private readonly paymentGatewayService: PaymentGatewayService,
  ) {
    this.logger = new PaytradeLogger('WEBHOOK_SERVICE');
    this.stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async handlePaymentResponse(response) {
    try {
      this.logger.log(
        `Request recieved while entering the handlePaymentResponse:: ${JSON.stringify(response)}`,
      );

      if (!response) throw `No webhook response received`;

      const subscriptionId =
        response?.parent?.subscription_details?.subscription ?? null;

      this.logger.log(`subscriptionId: ${subscriptionId}`);

      if (!subscriptionId) throw `Subscription Id not found`;

      const subscription =
        await this.stripe.subscriptions.retrieve(subscriptionId);

      this.logger.log(`subscription: ${JSON.stringify(subscription)}`);

      if (!subscription) throw `Subscription details not found`;

      let subscriptionStatus =
        await this.paymentGatewayService.getSubscriptionStatus(
          subscription.status,
        );

      if (
        subscriptionId &&
        // response.payment_intent &&
        (parseFloat(response.amount_paid) > 0 ||
          (Array.isArray(response?.discounts) && response?.discounts?.length))
      ) {
        const subscriptionDetails = await this.subscriptionDetails.findOne({
          where: { stripe_subscription_id: subscriptionId },
          relations: ['pricingPlan'],
        });
        if (!subscriptionDetails) throw `Subscription Details not found`;

        let paymentMethod = null;

        if (subscriptionDetails.payment_method_id) {
          const paymentMethods = await this.stripe.paymentMethods.retrieve(
            subscriptionDetails.payment_method_id,
          );
          paymentMethod = `${paymentMethods.card.brand} *${paymentMethods.card.last4}`;
          this.logger.log(`paymentMethod: ${paymentMethod}`);
        }

        const data = {
          company_id: subscriptionDetails.company_id,
          plan_id: subscriptionDetails.plan_id,
          price_id: subscriptionDetails.price_id,
          customer_id: response.customer,
          subscription_id: subscriptionDetails.subscription_id,
          start_date: subscriptionDetails.start_date,
          expiry_date: subscriptionDetails.expiry_date,
          trial_start: subscription.trial_start
            ? moment.unix(subscription.trial_start).utc().toDate()
            : subscription.trial_start,
          trial_end: subscription.trial_end
            ? moment.unix(subscription.trial_end).utc().toDate()
            : subscription.trial_end,
          payment_method: paymentMethod,
          stripe_subscription_id: subscriptionId,
          payment_intent: response?.payment_intent || null,
          invoice_id: response.id,
          invoice_number: response.number,
          amount_paid: response.amount_paid / 100,
          effective_at:
            moment.unix(response.effective_at).utc().toDate() ?? null,
          paid_at:
            moment.unix(response.status_transitions.paid_at).utc().toDate() ??
            null,
          status: response.status,
          attempt_count: response.attempt_count,
          attempted: response.attempted,
          next_payment_attempt: response.next_payment_attempt,
          hosted_invoice_url: response.hosted_invoice_url,
          invoice_pdf: response.invoice_pdf,
        };
        const dbData = await this.subscriptionTransaction.create(data);
        const dbResponse = await this.subscriptionTransaction.save(dbData);

        const updateSubscriptionDetails = await this.subscriptionDetails
          .createQueryBuilder()
          .update(SubscriptionDetails)
          .set({
            start_date: moment.tz('UTC'),
            expiry_date:
              subscriptionDetails.pricingPlan.bill_cycle === 'Month'
                ? moment(moment.tz('UTC')).add(1, 'months').utc().toDate()
                : moment(moment.tz('UTC')).add(1, 'years').utc().toDate(),
            status: subscriptionStatus,
            trial_start: subscription.trial_start
              ? moment.unix(subscription.trial_start).utc().toDate()
              : subscription.trial_start,
            trial_end: subscription.trial_end
              ? moment.unix(subscription.trial_end).utc().toDate()
              : subscription.trial_end,
            canceled_at: subscription.canceled_at
              ? moment.unix(subscription.canceled_at).utc().toDate()
              : subscription.canceled_at,
            updated_by: null,
            updated_on: moment.tz('UTC'),
            updated_group: 'SYSTEM',
          })
          .where(`stripe_subscription_id = :stripe_subscription_id`, {
            stripe_subscription_id: subscriptionId,
          })
          .execute();

        this.logger.log(`updateSubscriptionDetails: ${JSON.stringify(updateSubscriptionDetails)}`);
        return dbResponse;
      }
      throw `Subscription Id not found`;
    } catch (error) {
      const errMsg = error.message ? error.message : error;
      this.logger.log(
        `Error while entering the handlePaymentResponse:: ${JSON.stringify(errMsg)}`,
      );
      throw new Error(errMsg);
    }
  }

  async handleCancelResponse(response) {
    try {
      this.logger.log(
        `Request recieved while entering the handleCancelResponse:: ${JSON.stringify(response)}`,
      );

      if (!response) throw `No webhook response received`;

      const subscriptionId = response?.id ?? null;

      this.logger.log(`subscriptionId: ${subscriptionId}`);

      if (!subscriptionId) throw `Subscription Id not found`;

      if (response && response.status && subscriptionId) {
        const subscriptionDetails = await this.subscriptionDetails.findOne({
          where: { stripe_subscription_id: subscriptionId },
        });
        if (!subscriptionDetails) throw `Subscription Details not found`;

        let subscriptionStatus =
          await this.paymentGatewayService.getSubscriptionStatus(
            response.status,
          );
        const subscriptionPlanDetails = await this.subscriptionPlanDetails
          .createQueryBuilder('pd')
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
          .where(`pd.plan_type = 'Free' and pd.plan_status = 'Active'`)
          .getRawOne();

        if (!subscriptionPlanDetails)
          throw `Your subscription plan has been cancelled. Please contact the Paytrade administrator to request access to the Free plan.`;

        if (response.cancel_at_period_end && response.status === 'canceled') {
          subscriptionDetails.plan_id = subscriptionPlanDetails.plan_id;
          subscriptionDetails.price_id = subscriptionPlanDetails.price_id;
          subscriptionDetails.amount = subscriptionPlanDetails.price;
          subscriptionDetails.start_date = moment.tz('UTC');
          subscriptionDetails.expiry_date = null;
          subscriptionStatus = 'Unsubscribed';
        } else if (
          response.cancel_at_period_end &&
          response.status === 'active'
        ) {
          subscriptionStatus = 'Cancelled';
        }
        subscriptionDetails.canceled_at = response.canceled_at
          ? moment.unix(response.canceled_at).utc().toDate()
          : response.canceled_at;
        subscriptionDetails.status = subscriptionStatus;
        subscriptionDetails.trial_start = response.trial_start
          ? moment.unix(response.trial_start).utc().toDate()
          : response.trial_start;
        subscriptionDetails.trial_end = response.trial_end
          ? moment.unix(response.trial_end).utc().toDate()
          : response.trial_end;
        subscriptionDetails.updated_by = null;
        subscriptionDetails.updated_on = moment.tz('UTC');
        subscriptionDetails.updated_group = 'SYSTEM';
        return await this.subscriptionDetails.save(subscriptionDetails);
      }
      throw `Subscription Id not found`;
    } catch (error) {
      const errMsg = error.message ? error.message : error;
      this.logger.log(
        `Error while entering the handleCancelResponse:: ${JSON.stringify(errMsg)}`,
      );
      throw new Error(errMsg);
    }
  }
}
