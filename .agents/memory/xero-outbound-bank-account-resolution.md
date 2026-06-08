---
name: Xero outbound bank-account resolution must prefer ACTIVE
description: Why outbound payment/transfer pushes pick the wrong Xero bank account and how to resolve it deterministically
---

# Outbound Xero bank-account resolution must prefer the ACTIVE mapping

A single PT bank account (`pt_bank_account_id`) can carry **multiple**
`xero_bank_account_details` rows for the same `integration_id`:
- an **Auto** mapping that is `DRAFT`/`ARCHIVED` — an auto-created placeholder
  pushed to Xero on connect (named after the PT account), never a real
  transactable Xero bank account.
- a **Manual**/**System** mapping that is `ACTIVE` — the real bank account the
  user mapped (often same BSB + account number as the Auto one).

Xero only transacts on **ACTIVE** accounts. A plain
`findOne({ where: { pt_bank_account_id, integration_id } })` has no
`account_status` filter and no `ORDER BY`, so Postgres returns an **arbitrary**
row — frequently the stale `DRAFT` Auto mapping. Xero then rejects the push:
- payments → `"Account could not be found"`
- bank transfers → `"FromBankAccount ... could not be located"`

**Why:** observed on Signature Multi-Res (5 of 7 latest sync fails) — the ALBA
Project Trust Account had a DRAFT Auto mapping + an ACTIVE Manual mapping; the
resolver sent the DRAFT id.

**How to apply:** every OUTBOUND posting site that resolves a Xero account by
`pt_bank_account_id` (createPayment, createOverPayment, pushTrustMovement,
reverseTrustMovement, retention legs) must use
`resolvePostableXeroBankAccount(ptBankAccountId, integrationId)` — orders ACTIVE
first, then non-Auto, then most-recent `updated_on`. Do NOT change INBOUND
matchers that resolve by `account_id` (Xero id → PT account); those are a
different query. Single-mapping accounts are unaffected (same row returned).

Fixing the selection logic is correct; do NOT just dedupe the data — the user
explicitly wanted the *why*, not a one-off consolidation.
