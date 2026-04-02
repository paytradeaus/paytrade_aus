import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { StripeWebhookService } from './webhook.service';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { Public } from 'src/api/auth/jwt-guard/public.decorator';
import { getStripeInstance, getWebhookSecret } from 'src/libs/@stripe-helper/stripe-helper';

@Controller('stripe-webhook')
export class StripeWebhookResolver {
  private logger: PaytradeLogger;
  constructor(private readonly stripeService: StripeWebhookService) {
    this.logger = new PaytradeLogger('WEBHOOK_RESOLVER');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @Post()
  @Public()
  async handleWebhook(@Req() request: Request, @Res() response: Response) {
    const sig = Array.isArray(request.headers['stripe-signature'])
      ? request.headers['stripe-signature'][0]
      : request.headers['stripe-signature'];

    let event;
    const stripe = getStripeInstance(false);

    try {
      this.logger.log('Inside handleWebhook');

      try {
        const liveSecret = getWebhookSecret(true);
        event = stripe.webhooks.constructEvent(
          request.body,
          sig as string,
          liveSecret,
        );
      } catch (liveErr) {
        this.logger.log('Live webhook verification failed, trying test secret');
        const testSecret = process.env.STRIPE_TEST_WEBHOOK_SECRET;
        if (testSecret) {
          const testStripe = getStripeInstance(true);
          event = testStripe.webhooks.constructEvent(
            request.body,
            sig as string,
            testSecret,
          );
        } else {
          throw liveErr;
        }
      }

      this.logger.log(
        `Request recieved while entering the handleWebhook:: ${JSON.stringify(event)}`,
      );
      let dbResponse;
      // Handle the event
      switch (event.type) {
        case 'invoice.payment_succeeded':
          const invoicePaymentSucceeded = event.data.object;
          // Then define and call a function to handle the event invoice.payment_succeeded
          this.logger.log(
            `Request recieved while entering the handleWebhook::invoicePaymentSucceeded:: ${JSON.stringify(invoicePaymentSucceeded)}`,
          );
          this.logger.log(`invoicePaymentSucceeded: ${JSON.stringify(invoicePaymentSucceeded)}`);
          dbResponse = await this.stripeService.handlePaymentResponse(
            invoicePaymentSucceeded,
            event.livemode,
          );
          this.logger.log(
            `Request recieved while entering the handleWebhook::dbResponse:: ${JSON.stringify(dbResponse)}`,
          );
          break;
        case 'invoice.payment_failed':
          const invoicePaymentFailed = event.data.object;
          this.logger.log(
            `Request recieved while entering the handleWebhook::invoicePaymentFailed:: ${JSON.stringify(invoicePaymentFailed)}`,
          );
          this.logger.log(`invoicePaymentFailed: ${JSON.stringify(invoicePaymentFailed)}`);
          dbResponse =
            await this.stripeService.handlePaymentResponse(
              invoicePaymentFailed,
              event.livemode,
            );
          this.logger.log(
            `Request recieved while entering the handleWebhook::dbResponse:: ${JSON.stringify(dbResponse)}`,
          );
          break;
        case 'customer.subscription.updated':
          const cancelSubscriptionAtTrialEnd = event.data.object;
          this.logger.log(
            `Request recieved while entering the handleWebhook::cancelSubscriptionAtTrialEnd:: ${JSON.stringify(cancelSubscriptionAtTrialEnd)}`,
          );
          this.logger.log(
            `cancelSubscriptionAtTrialEnd: ${JSON.stringify(cancelSubscriptionAtTrialEnd)}`,
          );
          dbResponse = await this.stripeService.handleCancelResponse(
            cancelSubscriptionAtTrialEnd,
            event.livemode,
          );
          this.logger.log(
            `Request recieved while entering the handleWebhook::dbResponse:: ${JSON.stringify(dbResponse)}`,
          );
          break;
        case 'customer.subscription.deleted':
          const cancelSubscriptionImmediately = event.data.object;
          this.logger.log(
            `Request recieved while entering the handleWebhook::cancelSubscriptionImmediately:: ${JSON.stringify(cancelSubscriptionImmediately)}`,
          );
          this.logger.log(
            `cancelSubscriptionImmediately: ${JSON.stringify(cancelSubscriptionImmediately)}`,
          );
          dbResponse = await this.stripeService.handleCancelResponse(
            cancelSubscriptionImmediately,
            event.livemode,
          );
          this.logger.log(
            `Request recieved while entering the handleWebhook::dbResponse:: ${JSON.stringify(dbResponse)}`,
          );
          break;
        // ... handle other event types
        default:
          this.logger.log(`Unhandled event:: ${JSON.stringify(event)}`);
          this.logger.log(`Unhandled event type ${event.type}`);
      }
      response.status(200).json({ received: true });
    } catch (err) {
      this.logger.log(
        `Error while entering the handleWebhook:: ${err.message}`,
      );
      return response.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
}
