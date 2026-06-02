---
name: Xero sync-log dynamic_values keys must mirror template placeholders
description: Why a Failed/any xero_sync_log message renders raw {{placeholders}} and how to avoid it
---

A `xero_sync_logs` row has NO stored message column. The UI message is rendered
at read time by substituting the template's `{{key}}` placeholders with
`dynamic_values[key]` — literally `result.replace(new RegExp('{{'+key+'}}','g'), value)`
iterating over the `dynamic_values` object keys.

**Rule:** the keys you put in `dynamic_values` when calling `insertXeroSyncLogs`
MUST exactly match the `{{placeholder}}` names in that template's `description`
(in `xero-log-templates-seed-data/xero-log-templates.json`). A mismatch leaves the
placeholder literal in the UI (e.g. template 632 emitted `bank_transfer_id`/`amount`
while the template wanted `{{transfer_id}}`/`{{transfer_amount}}`/`{{transfer_date}}`/
`{{from_account}}`/`{{to_account}}` → message showed raw `{{transfer_id}}`).

**Why it bites:** `information_required` (structured JSON for the frontend dropdown)
and `dynamic_values` (the message variables) are SEPARATE. It's easy to populate the
rich structured payload and forget the message needs its own flat, template-named
keys. Sibling templates that render correctly (e.g. 501/502) set `dynamic_values`
keys identical to their placeholders — copy that convention.

**How to apply:** whenever you add or edit a log template, open the template's
`description`, list every `{{...}}`, and ensure the writer's `dynamic_values` has a
key for each (flat string values, pre-formatted for display — currency/date should
be formatted in the writer, not the template). This is render-time, key-based, so an
already-written row keeps its OLD keys: fixing the code only repairs NEW logs; an
existing broken row needs its `dynamic_values` JSON patched directly.
