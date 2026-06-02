---
name: Edit Contract form stale Client/Supplier from shared draft blob
description: Why the Add/Edit Contract form can show a supplier belonging to no related contract, and the two complementary hydration effects that must stay aligned.
---

# Edit Contract form stale draft state

The Add/Edit Contract form (Contracts/AddEditContracts) has THREE state
sources that can populate the same fields, and they must stay mutually
exclusive or a stale value wins:

1. Redux `addContractDetails` — leftover add/edit session draft.
2. `/api/route-data` server blob (`routePathStoredData`, loaded by
   `getStoredFormData`) — a **process-wide, cross-module draft that is never
   cleared**. Written by `handleAddQuickRecord` during a quick-add round trip
   (add a new supplier/project mid-form) with markers `quickAddFromContract`
   / `fromDraftContract`.
3. The freshly fetched contract (`viewContractDetailsById` → `contractData`).

**Symptom:** Edit form shows a Client/Supplier that belongs to neither the
edited contract nor any related contract (it's a value picked in some earlier
quick-add/draft session). Backend + DB are correct — the relation join on
`client_supplier_id` returns the right name.

**Rules / invariants:**
- For a genuine edit-by-id load, the fetched `contractData` must be
  authoritative. The hydration effect must only defer to the draft-restore
  effect for a real CONTRACT round-trip (`quickAddFromContract ||
  fromDraftContract`), NOT for any non-empty blob — the blob is shared and
  stale by default.
- The draft-restore effect and the contract-hydration effect must trigger on
  complementary conditions so exactly one owns the form.
- Dropdown SELECTED-object binding does `clientSupplierOptions.find(...)`;
  the effect must depend on `clientSupplierOptions`/`projectOptions` or the
  selection stays null when the contract fetch wins the race against the
  options fetch.

**Why:** The shared `/api/route-data` blob persists indefinitely with no
delete path, so gating real hydration on "blob has any keys" silently breaks
every later edit until the blob happens to be overwritten.

**Related:** A separate prior fix clears stale Redux `addContractDetails` on
mount when opening Edit from a fresh URL (e.g. the compliance "Go to
Contract" link). That covers source 1 only; source 2 needed the round-trip
narrowing above.
