---
name: Activity log impersonation skip
description: Why admin "login-as-user" actions silently produced no activity history, and the correct shape for impersonated activity-log rows.
---

# Impersonated activity logs must not be skipped, and must stay is_admin=false

`insertActivityLog` (activity-log.service.ts) skips inserts when the event has no
attribution. The original guard skipped `!is_admin && !from_user`, which silently
dropped every admin **login-as-user** (impersonation) action.

**Why:** call sites that log a user action build the input as
`is_admin: false`, and during impersonation (`decoded.logged_in_by === 'ADMIN'`)
set `from_user: null`, `to_user: <impersonated userId>`, `admin_id: <admin>`.
That `is_admin=false` + `from_user=null` combination tripped the guard → no row,
no error. This pattern is copy-pasted across many call sites (payments status
changes, ABA, etc.), so the bug is systemic, not local.

**The fix is the guard, not the call sites:** add `&& !admin_id` to the skip
condition so impersonated events (admin_id present) are inserted, while genuinely
unattributed events are still skipped.

**Do NOT "fix" it by setting is_admin=true at call sites.** The user-facing read
(`getActivityLog`) shows rows to a user via
`(from_user = me OR to_user = me) AND is_admin IS FALSE` (system-added companies),
and the actor-name display CASE explicitly renders `is_admin=false / from_user=null
/ to_user NOT NULL / admin_id NOT NULL` as **"Admin"**. So impersonated rows are
designed to be stored with is_admin=false; flipping to true would hide them from
the affected user and only surface them in admin-only views.

**How to apply:** any new activity-log call that supports impersonation must keep
`is_admin: false` and populate `to_user` + `admin_id`; never gate the insert on
`from_user` alone.
