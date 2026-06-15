---
name: Edit Contract shows wrong Client/Supplier when referenced party is soft-deleted
description: A native <select> renders the FIRST option when its value matches no option; referenced suppliers/projects that were soft-deleted are excluded from pickers, so the form shows an unrelated record.
---

# Edit Contract wrong supplier — native <select> + excluded referenced entity

**Symptom:** Edit Contract form shows a Client/Supplier that belongs to a
different contract (e.g. "1300 Locate") even though the DB/backend correctly
resolve the contract's real supplier. Happens from every entry point (compliance
"Go to Contract" and "Edit contract" on View Contract), not just one — so it is
NOT the stale-draft blob bug (`contract-form-stale-draft-state.md`).

**Root cause (two parts):**
1. The Client/Supplier field is a **native HTML `<select>`** (Inputs/Select.tsx).
   Its placeholder `<option>` only renders when `!value`. When `value` is a
   truthy string that matches NO `<option>`, the browser silently renders the
   **first** option. Pickers are sorted ASC by name, so a leading-digit name
   like "1300 Locate" surfaces.
2. `getClientSupplierLists` filters `is_deleted=false, is_archived=false,
   status='Completed'`. A contract whose supplier was later soft-deleted still
   resolves the correct name via the TypeORM relation (join is on the integer
   `client_supplier_id`; there is NO @DeleteDateColumn soft-delete scope, so
   deleted rows still join), but that name is absent from the picker options.

So formik gets the correct `client_supplier_name`, the `<select>` can't match it,
and shows the first active supplier instead.

**Fix pattern:** In the contract-hydration effect, re-inject the contract's own
supplier into `clientSupplierOptions` when missing, guarded by a
`!some(value===name)` check (the effect depends on `clientSupplierOptions`, so the
guard prevents an append loop).

**Why:** Pickers must hide deleted/archived records for NEW selections, but an
edit form must still be able to DISPLAY a historical referenced value. A native
`<select>` cannot show a value that has no matching option.

**How to apply / parity:** The same latent bug applies to the Project `<select>`
(`projectOptions`, fed by `getProjectsLists({isArchived:false})`) and to any
native-select picker bound to an active-only list while editing a record that may
reference an archived/deleted entity. Inject the current value if absent. (Project
parity left as a follow-up at time of the supplier fix.)
