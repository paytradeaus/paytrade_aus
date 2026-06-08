---
name: GraphQL input type mismatches cause silent save failures
description: When a frontend mutation variable's JSON type doesn't match the schema (e.g., Number where String is declared), Apollo Server rejects the whole call at the schema-validation layer before any resolver runs — silent unless the FE catch surfaces the error.
---

# Rule
Always check the **JSON type** of every field in a GraphQL mutation variable against the backend `@Field()` declaration. A type mismatch produces an Apollo error `Variable "$X" got invalid value …` that:
- Never reaches the resolver (no backend logs at all).
- Returns a 400 with `extensions.code = BAD_USER_INPUT`.
- In this codebase, `app.module.ts`'s `formatError` rewrites it to `"Please provide a valid value for the field: <varName>."` — a generic message that hides which field is actually wrong.
- Frontend code that does `try { … } catch { return false; }` (very common in `*.functions.tsx`) swallows it: spinner flashes, dialog stays open, no toast, nothing persisted.

**Why:** BSB was retyped from `number` to `string` in the backend DTO so leading zeros like `"064000"` survive the wire, but the frontend kept casting `Number(data?.bsb_number)` for both Add and Update. Any client/supplier with even one existing bank account row could never be saved.

**How to apply:**
- When changing a DTO field's type, grep the FE for `Number(field)` / `String(field)` / `parseInt(field)` and update every payload builder.
- When a save mysteriously "flashes and reverts" with no backend log, inspect the Network tab response for the `BAD_USER_INPUT` error — the variable name in the original Apollo message (before `formatError` rewrites it) tells you the exact field.
- Silent `catch { return false }` blocks in `*.functions.tsx` should always at least `console.error(err)` and `showErrorToast(error?.graphQLErrors?.[0]?.message || …)` — otherwise schema/validator failures are invisible to both user and devs.
- The `formatError` in `back-end/src/app.module.ts` only surfaces the variable name, not the field path within it — so "got invalid value for updateClientSuppliersDetailInput" doesn't tell you which inner field failed. Check the raw Apollo error in DevTools Network response, not the rewritten message.
- Goes both directions: sending a **string where a numeric `@Field()` is declared** fails identically. Watch the **sync-log "Resolve & retry" replay path** especially: payloads are rebuilt from `xero_sync_logs.api_payload`, where numeric IDs are often stored as **strings** (e.g. `payment_id:"10000000048"`). Each payload-builder field must coerce to match the DTO (`Number(...)` for numeric `@Field()`s); coercing only some fields (e.g. `+bank_account_id` but not `payment_id`) leaves a silent `BAD_USER_INPUT` that writes no sync log at all — the button looks dead.
