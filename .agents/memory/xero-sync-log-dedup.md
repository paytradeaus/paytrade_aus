---
name: xero_sync_logs deduplicates repeated identical failures
description: Why a re-run that "adds no new sync-log row" is often just bumping a dedup counter on the existing row.
---

`xero_sync_logs` collapses repeated identical failures into a SINGLE row rather than
inserting a new one each time. On a repeat it updates that row's `dynamic_values`:
`{ first_occurred_at, last_occurred_at, occurrence_count }` (and refreshes the trigger
message), keyed by something like (reference_id + log_template_id + payload shape).

**Why:** This is the #1 cause of "I deployed/re-ran and STILL no second row appears!"
The row IS being written — `occurrence_count` increments and `last_occurred_at` advances
to the exact moment of the latest re-run. Sorting `ORDER BY created_on DESC` HIDES it,
because `created_on` stays at the first occurrence; the row floats to the bottom while a
fresh trigger (template 520) sits at the top with no visible child.

**How to apply:** When diagnosing "no detail row after the trigger," do NOT trust
recency by `created_on`. Pull the candidate detail row by `reference_id` and read its
`dynamic_values.last_occurred_at` / `occurrence_count` — if `last_occurred_at` matches
the user's latest re-run, that row IS the answer and the failure is unchanged. Confirmed
on Alba 2501-1-1 (company 1012): template 456 row, occurrence_count 6, last_occurred_at
= the post-deploy re-run timestamp.
