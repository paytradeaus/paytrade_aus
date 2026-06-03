---
name: Contract payment_to_account PTA resolution divergence
description: Two code paths resolve a contract's Project Trust Account differently; the user-side one wrongly requires the PTA to belong to the contract's client_supplier_id, excluding project-scoped PTAs.
---

# Two divergent "which account does this contract pay to" resolvers

A Project Trust Account (PTA) / Retention Trust Account (RTA) is **project-scoped**:
it is linked to a project via `bank_accounts.project_ids` (simple-array, e.g. `1006`),
`added_by_client_supplier = false`, and its `client_supplier_id` is NULL or some
unrelated value. It is NOT owned by the client/supplier party of any one contract.

Two code paths pick a contract's `payment_to_account`, and they disagree:

1. **Xero-inbound `smartCreateContract`** (`xero-invoices.service.ts`, PTA resolve ~6492-6524):
   filters PTAs by `account_type === 'Project Trust Account'` AND `project_ids includes project_id`
   only. **Correct.** For a Client/Principal contract on a PTA-eligible project it sets
   `payment_to_account = ptaAccount.bank_account_id`.

2. **User-side dropdown / resolver** (`bank-accounts.service.ts`, `getAccountTypesForContract`
   + the Client branch query ~2260-2293): for the two-allowed-types case
   (`['Cash Account','Project Trust Account']`) the PTA sub-clause is
   `b.project_ids LIKE :project_id AND b.client_supplier_id = :client_supplier_id AND b.account_type='Project Trust Account'`.
   The extra **`b.client_supplier_id = :client_supplier_id`** predicate filters out every
   project-scoped PTA (PTA's client_supplier_id ≠ the contract's). Note the *supplier-side*
   `payment_from_account` query (~2312-2318) does NOT have this predicate — it matches PTA by
   `project_ids` only. So the bug is specifically the client_supplier_id join on the
   payment_to (Client) PTA branch.

**Symptom:** Edit-Contract "Payment to account" dropdown shows only Cash Accounts (no PTA),
and a contract created via the user-side path inherits a Cash Account. A Receivable payment
auto-created from that contract then copies the wrong account → funds land in the operating
Cash Account instead of the PTA (trust-accounting breach).

**Why:** PTAs are matched by project, not by counterparty. Any query that ANDs a PTA lookup
with `client_supplier_id = <contract party>` will silently drop the PTA.

**How to apply:** When touching contract account selection, keep PTA/RTA resolution
`project_ids`-only and keep the two resolvers in sync. Don't add a client_supplier_id filter
to a trust-account branch.
