import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { StripeWebhookService } from './webhook.service';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { Public } from 'src/api/auth/jwt-guard/public.decorator';

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
      ? request.headers['stripe-signature'][0] // take the first element if it's an array
      : request.headers['stripe-signature']; // or use it as a string if it's not an array

    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });

    try {
      console.log('Inside handleWebhook');
      const event = stripe.webhooks.constructEvent(
        request.body,
        sig as string,
        endpointSecret,
      );

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
          console.log('invoicePaymentSucceeded: ', invoicePaymentSucceeded);
          dbResponse = await this.stripeService.handlePaymentResponse(
            invoicePaymentSucceeded,
          );
          this.logger.log(
            `Request recieved while entering the handleWebhook::dbResponse:: ${JSON.stringify(dbResponse)}`,
          );
          break;
        case 'invoice.payment_failed':
          const invoicePaymentFailed = event.data.object;
          // Then define and call a function to handle the event invoice.payment_failed
          this.logger.log(
            `Request recieved while entering the handleWebhook::invoicePaymentFailed:: ${JSON.stringify(invoicePaymentFailed)}`,
          );
          console.log('invoicePaymentFailed: ', invoicePaymentFailed);
          dbResponse =
            await this.stripeService.handlePaymentResponse(
              invoicePaymentFailed,
            );
          this.logger.log(
            `Request recieved while entering the handleWebhook::dbResponse:: ${JSON.stringify(dbResponse)}`,
          );
          break;
        case 'customer.subscription.updated':
          const cancelSubscriptionAtTrialEnd = event.data.object;
          // Then define and call a function to handle the event invoice.payment_failed
          this.logger.log(
            `Request recieved while entering the handleWebhook::cancelSubscriptionAtTrialEnd:: ${JSON.stringify(cancelSubscriptionAtTrialEnd)}`,
          );
          console.log(
            'cancelSubscriptionAtTrialEnd: ',
            cancelSubscriptionAtTrialEnd,
          );
          dbResponse = await this.stripeService.handleCancelResponse(
            cancelSubscriptionAtTrialEnd,
          );
          this.logger.log(
            `Request recieved while entering the handleWebhook::dbResponse:: ${JSON.stringify(dbResponse)}`,
          );
          break;
        case 'customer.subscription.deleted':
          const cancelSubscriptionImmediately = event.data.object;
          // Then define and call a function to handle the event invoice.payment_failed
          this.logger.log(
            `Request recieved while entering the handleWebhook::cancelSubscriptionImmediately:: ${JSON.stringify(cancelSubscriptionImmediately)}`,
          );
          console.log(
            'cancelSubscriptionImmediately: ',
            cancelSubscriptionImmediately,
          );
          dbResponse = await this.stripeService.handleCancelResponse(
            cancelSubscriptionImmediately,
          );
          this.logger.log(
            `Request recieved while entering the handleWebhook::dbResponse:: ${JSON.stringify(dbResponse)}`,
          );
          break;
        // ... handle other event types
        default:
          this.logger.log(`Unhandled event:: ${JSON.stringify(event)}`);
          console.log(`Unhandled event type ${event.type}`);
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
