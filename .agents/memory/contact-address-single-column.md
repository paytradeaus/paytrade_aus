---
name: Contact address is one varchar, not structured fields
description: client_suppliers_details stores the whole address in one column, which dictates how Xero import and manual entry must behave.
---

# Contact address storage model

`client_suppliers_details` has only THREE address-related columns:
`client_supplier_address` (a single free-text varchar holding the entire
address), `region`, and `country`. There are **no** suburb/city/postcode/
street-line columns.

**Consequences (the durable lessons):**
- **Xero import/sync must FLATTEN every Xero address component**
  (addressLine1-4 + city/region/postalCode) into the one
  `client_supplier_address` string. Mapping only `addressLine1` silently drops
  suburb/state/postcode — the original bug (e.g. stored "PO Box 5288" when Xero
  had "PO Box 5288 / Kenmore East / 4069"). Use
  `XeroContactsService.composeXeroAddress()`; it is used on BOTH the create
  path (`buildContactPayloadFromXero`) and the webhook update path
  (`handleContactCreateUpdate`). Keep both in sync.
- The frontend Address field is a Google Places autocomplete
  (`GooglePlacesInput`, a react-select that only fires onChange on a selected
  result), so users could not save an address Google can't find. It now has an
  opt-in `allowManualEntry` prop (enabled on the Clients/Suppliers form) that
  toggles to a plain text input; manual entry calls `onChange(typedString)`
  with NO placeDetails. Any consumer's onChange handler MUST tolerate a missing
  placeDetails arg (the old contacts handler did `JSON.parse(JSON.stringify(
  undefined))` which throws) — guard it and clear stale place_id/lat/long.

**Note:** existing already-imported contacts are not retroactively fixed; they
update on the next Xero contact change (webhook/scheduler) or a manual re-sync.
