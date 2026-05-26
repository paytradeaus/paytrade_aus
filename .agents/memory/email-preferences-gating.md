---
name: Email preferences gating
description: Convention for `user_details.email_preferences` / `company_details.email_preferences` JSON toggles in PayTrade.
---

# Default-ON email preferences

All recognised personal/company email-preference toggles in PayTrade are
**opt-IN by default**. Missing key, NULL JSON, and `null` value all mean
"the user wants this email"; only an explicit `false` opts them out.

**Why:** Historically the gating queries used `= 'true'`, which silently
suppressed emails for every user created before the key was added (their
JSON simply didn't have the field). That meant adding a new preference
key effectively defaulted *every existing user to OFF* until they visited
their profile page and saved. Default-ON eliminates that whole class of
"why didn't I get the email" bug.

## How to apply

When adding a new boolean email-preference key:

1. **Allowlist** the key in `UserEmailPreferences` (or
   `CompanyEmailPreferences`) — without this the update mutation will
   silently strip it.
2. If the key is a default-ON boolean, add it to
   `UserDefaultOnEmailPreferenceKeys` and the
   `DefaultUserEmailPreferences` object in
   `back-end/src/entities/user-details.entity.ts`.
3. **Gating queries** must use
   `(email_preferences ->> 'key') IS DISTINCT FROM 'false'`
   — NOT `= 'true'`. `IS DISTINCT FROM` is the only operator that treats
   NULL and missing as "not false".
4. **Signup seeders** (`insertUserDetails`, `pt-admin-access addUser`,
   any other paths that create user_details rows) must seed
   `email_preferences = { ...DefaultUserEmailPreferences, ...input }`.
5. **Read mapper** in `getUserDetailsByEmailId` must coerce missing keys
   to their default so the UI renders the right checkbox state.
6. **Bootstrap backfill** in `SignupService.onApplicationBootstrap`
   already fills missing keys idempotently via jsonb `||`; if you add a
   new key, add it to the `OR NOT (... ? 'key')` list there too.

## Two-stage pattern (master toggle + sub-mode)

For preferences that need both an on/off and a sub-mode (e.g.
`xero_sync_failures` master + `xero_sync_failures_mode`
`'immediate' | 'daily'`):

- Treat the master as a default-ON boolean (rules above).
- Store the mode as a string with a documented default (e.g. `'daily'`).
- Daily/batch cron paths must **exclude** users whose mode is
  `'immediate'` to avoid double-notify. The matching per-event path
  must check the mode is `'immediate'`. Default mode must put the user
  on the cron path so legacy rows with only the master flag still
  behave correctly.
- UI: render the sub-mode control conditionally under the master
  checkbox, so it hides cleanly when the user opts out.
