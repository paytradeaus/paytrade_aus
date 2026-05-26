# Stripe Subscription GST Mode (inclusive vs exclusive)

## The rule

- Stripe Tax in the dashboard is **OFF**. We compute GST manually via Stripe `TaxRate` objects, never `automatic_tax`.
- Every new subscription gets the **AU 10% exclusive** TaxRate — i.e. customer sees `plan_amount + 10% GST` on the invoice.
- Exactly one legacy customer (Signature) is grandfathered as **inclusive** — `$300` plan = `$272.73` ex-GST + `$27.27` GST, total still `$300`. They were created on an inclusive rate before this code existed.

## How we model it

- `subscription_details.is_gst_inclusive` (boolean, default `false`) — the only DB flag distinguishing the two modes. Used by the billing-history query/UI to label the row correctly.
- `PaymentGatewayService.getAuGstTaxRateId(stripe, isDemo, inclusive)` — cached by `${isDemo}:${inclusive}`. Returns the inclusive TaxRate when called for a grandfathered sub, exclusive otherwise.
- `upgradeSubscription` (and any other creation path) **must** pass the exclusive rate via `tax_rates` / `default_tax_rates`. It throws if the rate can't be resolved — we never silently create a no-GST subscription.
- A bootstrap health check (`OnApplicationBootstrap` on `PaymentGatewayService`) resolves the live exclusive rate and logs a loud error if it's missing.
- `LEGACY_INCLUSIVE_GST_SUB_IDS` env var (comma-separated Stripe `sub_xxx` ids) — a one-time backfill seeder reads it, attaches the inclusive TaxRate on Stripe, and flips `is_gst_inclusive=true` on the matching `subscription_details` row. Operator must populate this in production for Signature.

## Why

Two reasons the flag matters even though the GST math is the same (`gst = total / 11` for both inclusive and exclusive once you have the customer-facing total):

1. **Stripe behaviour diverges by mode.** An inclusive TaxRate makes Stripe subtract GST from the plan price (the customer pays the plan amount); an exclusive one adds it on top. Mixing them up will silently change what we charge.
2. **Receipt wording matters for the customer.** Signature's contract is for the inclusive price; flipping their existing sub to exclusive would 10%-up their bill overnight. The flag exists so the UI/PDF can render the right label and so we never accidentally re-create their sub on the exclusive rate.

## How to apply

- Creating a new sub anywhere in the codebase: always go through `getAuGstTaxRateId(stripe, isDemo, false)` and attach the resulting rate. Do not spread-guard `tax_rates` — it must always be set.
- Editing an existing inclusive sub: keep it inclusive. Do not "normalise" Signature to exclusive without explicit business sign-off.
- Adding a new grandfathered customer (should be rare → ideally never): add their Stripe sub id to `LEGACY_INCLUSIVE_GST_SUB_IDS` and re-run the seeder; do not hand-edit the DB.
- Never enable Stripe Tax / `automatic_tax` in code or in the Stripe dashboard. If you see PRs proposing it, reject — we own the tax calculation.
