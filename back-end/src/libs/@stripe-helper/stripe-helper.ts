import Stripe from 'stripe';

const STRIPE_API_VERSION = '2024-06-20';

export function getStripeInstance(isDemo: boolean): Stripe {
  const key = isDemo
    ? process.env.STRIPE_TEST_SECRET_KEY
    : process.env.STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error(
      isDemo
        ? 'STRIPE_TEST_SECRET_KEY is not configured'
        : 'STRIPE_SECRET_KEY is not configured',
    );
  }

  return new Stripe(key, { apiVersion: STRIPE_API_VERSION } as any);
}

export function getWebhookSecret(isLiveMode: boolean): string {
  const secret = isLiveMode
    ? process.env.STRIPE_WEBHOOK_SECRET
    : process.env.STRIPE_TEST_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error(
      isLiveMode
        ? 'STRIPE_WEBHOOK_SECRET is not configured'
        : 'STRIPE_TEST_WEBHOOK_SECRET is not configured',
    );
  }

  return secret;
}

export function getStripeSecretKey(isDemo: boolean): string {
  const key = isDemo
    ? process.env.STRIPE_TEST_SECRET_KEY
    : process.env.STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error(
      isDemo
        ? 'STRIPE_TEST_SECRET_KEY is not configured'
        : 'STRIPE_SECRET_KEY is not configured',
    );
  }

  return key;
}
