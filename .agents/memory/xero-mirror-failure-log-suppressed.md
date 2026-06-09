---
name: Xero record-mirror failure logs can be silently suppressed
description: Why a failed Xero->PT record import can produce NO sync-log row at all
---

When a Xero->PayTrade record import (account / contract / project) FAILS and the
linked `xero_*_details` mirror row has `pt_*_id IS NULL` (never imported) and is
not archived in Xero, `insertXeroSyncLogs` short-circuits and writes NO row — it
only emits a backend log line `skipped never_imported <type>-mirror log ... original_template=<id>`.

The suppressed failure templates are scoped per type (project 372/394, account
365/379, contract 375/409). Success templates (e.g. project 15) are NOT
suppressed, and once the create links the mirror (`pt_*_id` set) the skip no
longer fires anyway.

**Why:** intended as noise cleanup for placeholder mirrors users can't act on.
The side effect: a user-triggered import that fails and returns `false` shows a
generic FE error toast but leaves NOTHING in the sync-log UI to explain why.

**How to apply:** when debugging an "Unable to create/import X" report that has
no sync-log entry, do NOT conclude "no code ran". Trace the resolver's boolean
return value and the backend `skipped never_imported` log line — the explanatory
sync log was suppressed by this filter, not never generated.
