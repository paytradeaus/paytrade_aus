/**
 * Pure helpers for turning a Xero contact's address block into the single
 * varchar PayTrade stores (`client_suppliers_details.client_supplier_address`
 * is one column — there are no suburb/postcode fields, so every part must be
 * flattened in or it is silently dropped).
 *
 * Extracted from `XeroContactsService.composeXeroAddress` so services that do
 * not inject XeroContactsService (e.g. XeroInvoicesService' smart-contract
 * backfill) can reuse the exact same flattening without new DI wiring.
 */

/** POBOX preferred, then STREET, then whatever is first — mirrors the
 *  selection used by the contact webhook and buildContactPayloadFromXero. */
export function pickXeroAddress(contact: any): any | null {
  return (
    contact?.addresses?.find((a: any) => String(a.addressType) === 'POBOX') ||
    contact?.addresses?.find((a: any) => String(a.addressType) === 'STREET') ||
    contact?.addresses?.[0] ||
    null
  );
}

/**
 * Street lines (addressLine1-4) are joined with commas; the locality line
 * (city / region / postalCode) is space-joined and appended. Returns null
 * when Xero supplied no address parts at all.
 */
export function composeXeroAddress(xeroAddress: any): string | null {
  if (!xeroAddress) return null;
  const clean = (s: any) => (s ? String(s).trim() : '');
  const streetLines = [
    xeroAddress.addressLine1,
    xeroAddress.addressLine2,
    xeroAddress.addressLine3,
    xeroAddress.addressLine4,
  ]
    .map(clean)
    .filter((s: string) => s.length > 0);
  const localityLine = [
    xeroAddress.city,
    xeroAddress.region,
    xeroAddress.postalCode,
  ]
    .map(clean)
    .filter((s: string) => s.length > 0)
    .join(' ');
  const parts = [...streetLines];
  if (localityLine) parts.push(localityLine);
  const composed = parts.join(', ');
  return composed.length > 0 ? composed : null;
}
