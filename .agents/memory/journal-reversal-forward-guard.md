---
name: Journal reversal requires a forward journal
description: Trust-ledger REVERSAL journals must only be written when a forward journal exists for the same audit_id
---

Rule: `createJournalEntries` must skip inserting a REVERSAL-type journal (journal_type.process_name starts with `REVERSAL`, reverse_values points at the forward process_type) when no non-reversed forward journal exists for the same `audit_id` (= payment_id).

**Why:** Deleting a payment that never had its confirmation journals (e.g. an unconfirmed withdrawal that skipped forward-journal creation) still inserted REVERSAL entries. Those phantom reversals silently cancel a *different, still-valid* journal in the trust-ledger balance — a client's ledger diverged from Xero by ~$286k this way (4 phantom withdrawal reversals). journal_entries link to payments via `audit_id = payment_id`; `journal_type` joins via `process_id = journal_process_id`.

**How to apply:** Any new reversal path (payment delete, un-tick, edit) must go through the guarded `createJournalEntries` or replicate the "forward exists with is_reversed=false for this audit_id" check. When diagnosing ledger vs Xero discrepancies, look for REVERSAL journals whose audit_id has no forward journal — those are phantoms; repair = delete the phantom reversal rows.
