---
name: Xero inbound contact entity_type default
description: Why inbound Xero contact import crashed on entity_type 'Organisation' and the correct default
---

# Inbound Xero contact import must default entity_type to 'Business'

`client_suppliers_details_entity_type_enum` allows ONLY: `Business`,
`Sole Trader`, `Personal`, `Partnership`. Xero contacts have no equivalent
entity-type concept — they are organisations.

The webhook create path (`buildContactPayloadFromXero`, used by smart-create
contact on bill/invoice import) previously hardcoded
`entity_type: 'Organisation'`. `'Organisation'` is NOT an enum member, so the
insert throws `invalid input value for enum ... "Organisation"` and the whole
inbound bill/contact import fails (and retries forever on webhook + scheduler,
climbing occurrence_count).

**Fix:** default to `'Business'`.

**How to apply:** any code that maps a Xero contact into a PT
client/supplier must emit a valid enum value; never pass Xero's own
nomenclature ("Organisation") straight into a PT enum column. Related class of
bug to the ABN varchar(11) overflow — Xero field shapes don't match PT column
constraints; normalise at the import boundary.
