---
name: Railway prod can lag the repl's main branch
description: When a prod-only error contradicts a clean code trace, suspect deploy lag — the repl's committed main can be ahead of what Railway is running.
---

This repl's `main` (what you read/edit here) is NOT automatically what Railway production runs. Railway deploys from its own pipeline, so freshly-committed fixes can sit in main for days before reaching prod.

**Why:** an incident where a Receivable payment into a company-owned Project Trust Account (PTA) failed on prod with `null value in column "bank_account_id" of journal_entries`. Every journal path in the current tree was exhaustively traced and proven to resolve `bank_account_id` to the PTA (non-null) — the addPayment validation even has an explicit "skip for company-owned trust accounts (client_supplier_id NULL, e.g. Receivable claims)" branch. The contradiction (clean trace vs real prod error) resolved once `git log` showed the receivable/PTA + supplier-routing handling was committed only ~1 day earlier — prod was running older code lacking it.

**How to apply:** when a prod-only error can't be reproduced and the current code trace says it's impossible, run `git log --date=short -- <file>` on the relevant files. If the protective/handling code is recent (days old), the likely root cause is deploy lag, not a code bug. The resolution is to deploy current main to Railway, not to add speculative code. Confirm with the user before deploying.
