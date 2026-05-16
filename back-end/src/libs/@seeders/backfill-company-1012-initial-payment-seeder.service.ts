import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionTransaction } from 'src/entities/subscription-transactions.entity';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { getStripeInstance } from 'src/libs/@stripe-helper/stripe-helper';
import { isProductionEnvironment } from 'src/libs/@email-services/email-url-sanitizer';

const COMPANY_ID = 1012;
const STRIPE_SUBSCRIPTION_ID = 'sub_1TO9yEFWBcFrdkf6mLNjqDH2';

@Injectable()
export class BackfillCompany1012InitialPaymentSeederService
  implements OnApplicationBootstrap
{
  private logger: PaytradeLogger;

  constructor(
    @InjectRepository(SubscriptionTransaction)
    private subscriptionTransactionRepo: Repository<SubscriptionTransaction>,
    @InjectRepository(SubscriptionDetails)
    private subscriptionDetailsRepo: Repository<SubscriptionDetails>,
  ) {
    this.logger = new PaytradeLogger('BACKFILL_COMPANY_1012_INITIAL_PAYMENT');
  }

  async onApplicationBootstrap() {
    try {
      // Production-only: the missing $50 lives in the Railway/prod
      // Stripe live account and the prod Postgres (not in dev/staging).
      // Skip elsewhere so we don't hit the live Stripe API from dev or
      // insert prod-only rows locally.
      if (!isProductionEnvironment()) {
        this.logger.log(
          'Skipped — non-production environment (this seeder only runs in prod).',
        );
        return;
      }
      if (!process.env.STRIPE_SECRET_KEY) {
        this.logger.log('Skipped — STRIPE_SECRET_KEY is not configured.');
        return;
      }

      const sub = await this.subscriptionDetailsRepo.findOne({
        where: {
          company_id: COMPANY_ID,
          stripe_subscription_id: STRIPE_SUBSCRIPTION_ID,
        },
      });
      if (!sub) {
        this.logger.log(
          `Skipped — subscription_details row not found for company=${COMPANY_ID} stripe_sub=${STRIPE_SUBSCRIPTION_ID}.`,
        );
        return;
      }

      // Idempotency short-circuit: if we already have ANY row for this
      // stripe subscription, do nothing on subsequent boots. Backfill is
      // a one-shot recovery for invoices that the webhook race
      // (invoice.payment_succeeded arriving before subscription_details
      // existed) lost. Once we've inserted those, the live webhook
      // handles every future invoice.
      const existingForSub = await this.subscriptionTransactionRepo.find({
        where: { stripe_subscription_id: STRIPE_SUBSCRIPTION_ID },
        select: ['invoice_id'],
      });
      const existingInvoiceIds = new Set(
        existingForSub.map((r: any) => r.invoice_id),
      );
      this.logger.log(
        `Existing subscription_transaction rows for ${STRIPE_SUBSCRIPTION_ID}: ${existingForSub.length}`,
      );

      const stripe = getStripeInstance(false);

      // Pull every invoice on this subscription (page through if needed).
      const invoices: any[] = [];
      for await (const inv of stripe.invoices.list({
        subscription: STRIPE_SUBSCRIPTION_ID,
        limit: 100,
      })) {
        invoices.push(inv);
      }
      this.logger.log(
        `Stripe returned ${invoices.length} invoice(s) for ${STRIPE_SUBSCRIPTION_ID}.`,
      );

      const paid = invoices.filter(
        (i: any) => i.status === 'paid' && (i.amount_paid || 0) > 0,
      );
      const missing = paid.filter((i: any) => !existingInvoiceIds.has(i.id));
      if (missing.length === 0) {
        this.logger.log(
          `Nothing to backfill — all ${paid.length} paid invoice(s) already in subscription_transaction.`,
        );
        return;
      }

      // Resolve a payment-method label (matches webhook.service.ts).
      let paymentMethodLabel: string | null = null;
      if (sub.payment_method_id) {
        try {
          const pm: any = await stripe.paymentMethods.retrieve(
            sub.payment_method_id,
          );
          if (pm?.card) {
            paymentMethodLabel = `${pm.card.brand} *${pm.card.last4}`;
          }
        } catch (e: any) {
          this.logger.warn(
            `paymentMethods.retrieve failed (${sub.payment_method_id}): ${e.message}`,
          );
        }
      }

      let inserted = 0;
      for (const inv of missing) {
        const data: any = {
          company_id: sub.company_id,
          plan_id: sub.plan_id,
          price_id: sub.price_id,
          customer_id: inv.customer,
          subscription_id: sub.subscription_id,
          start_date: sub.start_date,
          expiry_date: sub.expiry_date,
          trial_start: null,
          trial_end: null,
          payment_method: paymentMethodLabel,
          stripe_subscription_id: STRIPE_SUBSCRIPTION_ID,
          payment_intent: inv.payment_intent || null,
          invoice_id: inv.id,
          invoice_number: inv.number,
          amount_paid: inv.amount_paid / 100,
          // Fallback chain: effective_at → paid_at → invoice.created.
          effective_at: inv.effective_at
            ? new Date(inv.effective_at * 1000)
            : inv.status_transitions?.paid_at
            ? new Date(inv.status_transitions.paid_at * 1000)
            : inv.created
            ? new Date(inv.created * 1000)
            : null,
          paid_at: inv.status_transitions?.paid_at
            ? new Date(inv.status_transitions.paid_at * 1000)
            : null,
          status: inv.status,
          attempt_count: inv.attempt_count,
          attempted: inv.attempted,
          next_payment_attempt: inv.next_payment_attempt,
          hosted_invoice_url: inv.hosted_invoice_url,
          invoice_pdf: inv.invoice_pdf,
        };
        const entity = this.subscriptionTransactionRepo.create(data);
        await this.subscriptionTransactionRepo.save(entity);
        this.logger.log(
          `Inserted ${inv.id} amount=$${data.amount_paid} paid_at=${
            data.paid_at?.toISOString?.() ?? 'null'
          }.`,
        );
        inserted++;
      }

      this.logger.log(
        `Backfill complete — inserted=${inserted}, already-present=${existingForSub.length}, total-paid=${paid.length}.`,
      );
    } catch (error: any) {
      // Never throw — boot must always succeed even if Stripe is down or
      // the key isn't configured. Failure here just leaves the row
      // un-backfilled until the next boot.
      this.logger.error(
        `Backfill failed (non-fatal): ${error.message ?? error}`,
      );
    }
  }
}
