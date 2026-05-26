---
name: Stripe subscription GST mode (inclusive vs exclusive)
description: How PayTrade keeps Stripe Tax OFF, uses manual TaxRates, grandfathers exactly one inclusive sub (Signature) via a per-row flag + env-driven backfill, and persists Stripe-reported tax on every invoice for the receipt UI.
---

# Rule

Stripe Tax (the dashboard automatic-tax feature) must stay **OFF** for PayTrade. GST is applied manually via Stripe `TaxRate` objects:

- New subs: AU 10% **exclusive** rate (GST added on top of the plan price).
- Exactly one legacy customer (Signature): AU 10% **inclusive** rate (plan price already contains GST, e.g. $300 = $272.73 + $27.27).

The distinction is persisted as `subscription_details.is_gst_inclusive` and grandfathered subs are listed in the `LEGACY_INCLUSIVE_GST_SUB_IDS` env var (comma-separated Stripe `sub_xxx` ids), consumed by a bootstrap seeder.

Receipts read GST from `subscription_transaction.stripe_tax_amount` / `stripe_total_excluding_tax` (captured on the Stripe invoice webhook + back-filled at boot from the invoice id). Fallback when null is `total / 11`, which is identical to the Stripe calculation for both inclusive and exclusive AU 10% GST, but the persisted values stay the source of truth so non-GST invoices and rounding edge cases match what was actually charged.

**Why:** Past pricing was sold as inclusive to Signature; flipping them to exclusive would silently 10%-up their bill. Going forward, exclusive is simpler and matches how the pricing page is presented. Enabling Stripe automatic_tax would override our manual rates and re-derive tax from product/customer addresses we don't reliably collect — we own the calc.

**How to apply:**

- Any new-sub creation path must call `PaymentGatewayService.getAuGstTaxRateId(stripe, isDemo, /*inclusive*/ false)` and attach the result to both `tax_rates` and `default_tax_rates`. Do not spread-guard — the rate must always be set; throw if it resolves null.
- Boot health check (`[STRIPE_TAX_HEALTH]` logs) must validate BOTH live and sandbox modes. Missing sandbox keys are a "skipped" log, not an error; missing live rate is loud.
- Invoice webhook must persist `tax` and `total_excluding_tax` from the Stripe invoice. The billing-history endpoint prefers the persisted values; computed fallback is only for legacy rows the backfill hasn't reached.
- Do not "normalise" Signature (or any other row flagged `is_gst_inclusive=true`) onto the exclusive rate without explicit business sign-off.
- Receipt UI labels off `is_gst_inclusive`; the dollar math (`gst = total / 11`) is identical either way, but the wording isn't.
- Never turn on Stripe Tax / automatic_tax in code or dashboard. Reject PRs that try.
- New grandfathered customers (should be ~never): add their sub id to `LEGACY_INCLUSIVE_GST_SUB_IDS` and re-run the seeder; don't hand-edit the DB.
