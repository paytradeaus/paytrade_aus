/**
 * Sync log deep-link helpers.
 *
 * Returns:
 *  - `xero_deep_link`     : absolute URL on go.xero.com / invoicing.xero.com
 *  - `paytrade_deep_link` : in-app relative path (the FE uses next/router)
 *
 * Returns `null` whenever we don't have enough info to land the user on
 * the right record (e.g. no shortCode for tracking-category–backed
 * Projects/Contracts, or a Payment with no parent invoice id) — the
 * frontend hides the button when the value is null.
 *
 * Design notes:
 *  - Xero invoice/bill URLs use the modern `invoicing.xero.com/edit/{id}`
 *    form which works for both ACCREC and ACCPAY without a tenant
 *    short-code.
 *  - Payments don't have a public deep link in Xero, so we link to the
 *    parent invoice when available.
 *  - PT routes are mirrored from `front-end/src/shared/constant/appRoutes.ts`.
 *    Payments deep-link to the parent claim with `?payment=<id>` and fall
 *    back to `/user/payments-list` when we only have the payment id.
 */

type LooseRow = Record<string, any> | null | undefined;

function firstRecord(arr: any): any | null {
  if (Array.isArray(arr) && arr.length > 0 && arr[0] != null) return arr[0];
  return null;
}

/**
 * Normalise the raw `sync_type` string into one of a small set of
 * category buckets the resolvers below switch on.
 *
 * The seed data for `xero_log_templates` ships variants like
 * "Invoice schedulers", "Invoice webhook", "Contact schedulers",
 * "Project schedulers", "Account schedulers", "Retention journals" —
 * these all describe the same underlying record type from a deep-link
 * perspective ("Invoice webhook" still resolves to a single Xero
 * invoice, etc.). Without this normalisation the switch would only
 * match "Invoices"/"Bills"/etc and the buttons would silently disappear
 * on the majority of real-world sync log rows.
 */
function normaliseSyncType(syncType: string | undefined | null): string | null {
  if (!syncType) return null;
  const t = syncType.trim();

  // Direct hits first (preserve casing for back-compat with existing rows).
  const direct = new Set([
    'Invoices',
    'Bills',
    'Contacts',
    'Payments',
    'Bank accounts',
    'Projects',
    'Contracts',
    'ManualJournal',
    'ManualJournals',
    'Manual Journals',
  ]);
  if (direct.has(t)) return t;

  const lower = t.toLowerCase();

  // Suffix-stripped variants: "Invoice schedulers" / "Invoice webhook" → Invoices, etc.
  if (lower.startsWith('invoice')) return 'Invoices';
  if (lower.startsWith('bill')) return 'Bills';
  if (lower.startsWith('contact')) return 'Contacts';
  if (lower.startsWith('payment')) return 'Payments';
  if (lower.startsWith('project')) return 'Projects';
  if (lower.startsWith('contract')) return 'Contracts';
  if (lower.startsWith('account schedulers') || lower.startsWith('bank'))
    return 'Bank accounts';
  if (lower.startsWith('retention journals') || lower.startsWith('manualjournal') || lower.startsWith('manual journal'))
    return 'ManualJournals';

  return t; // fall through — unknown type, switch will hit default and return null
}

export function buildXeroDeepLink(row: LooseRow): string | null {
  if (!row) return null;
  const syncType = normaliseSyncType(row.sync_type as string | undefined);
  const xeroId = (row.xero_id as string | undefined) || null;
  const xeroRecord = firstRecord(row.xero_records);
  const xeroDetails = (row.xero_details as Record<string, any>) || {};

  switch (syncType) {
    case 'Invoices':
    case 'Bills': {
      const id =
        xeroId ||
        xeroRecord?.invoiceID ||
        xeroRecord?.InvoiceID ||
        null;
      return id ? `https://invoicing.xero.com/edit/${id}` : null;
    }
    case 'Contacts': {
      const id =
        xeroId ||
        xeroDetails?.contact_id ||
        xeroRecord?.contactID ||
        xeroRecord?.ContactID ||
        null;
      return id ? `https://go.xero.com/Contacts/View/${id}` : null;
    }
    case 'Payments': {
      // Payments have no direct public URL — link to the parent invoice.
      const invId =
        xeroRecord?.invoice?.invoiceID ||
        xeroRecord?.invoice?.InvoiceID ||
        xeroRecord?.Invoice?.InvoiceID ||
        null;
      return invId ? `https://invoicing.xero.com/edit/${invId}` : null;
    }
    case 'ManualJournal':
    case 'Manual Journals':
    case 'ManualJournals': {
      const id =
        xeroId ||
        xeroRecord?.manualJournalID ||
        xeroRecord?.ManualJournalID ||
        null;
      // Xero deprecated the legacy `/ManualJournals/View.aspx?journalID=…`
      // URL — it now returns an openresty 502. The Bank/RestoreManualJournal
      // endpoint is the supported way to land on a single MJ and is the
      // same URL we render in the retention-journals table.
      return id
        ? `https://go.xero.com/Bank/RestoreManualJournal.aspx?ID=${id}`
        : null;
    }
    case 'Bank accounts': {
      // No per-account public URL without shortCode. Land on the bank
      // accounts list which is universally reachable.
      return 'https://go.xero.com/Bank/BankAccounts.aspx';
    }
    case 'Projects':
    case 'Contracts':
      // Tracking categories — no stable public per-record URL without
      // shortCode. Skip the button rather than dump the user on an
      // ambiguous landing page.
      return null;
    default:
      return null;
  }
}

export function buildPaytradeDeepLink(row: LooseRow): string | null {
  if (!row) return null;
  const syncType = normaliseSyncType(row.sync_type as string | undefined);
  const ptDetails = (row.paytrade_details as Record<string, any>) || {};
  const ptRecord = firstRecord(row.paytrade_records);

  // For Invoices/Bills the reference.paytradeId stored on the sync log
  // is the payment_claim_id, so it's a safe fallback when the joined
  // paytrade_records array is empty (e.g. log row was created before the
  // claim was inserted).
  const paytradeId = (row.paytrade_id as string | undefined) || null;

  switch (syncType) {
    case 'Invoices':
    case 'Bills': {
      const claimId = ptRecord?.payment_claim_id || paytradeId;
      return claimId ? `/user/claims/view/${claimId}` : null;
    }
    case 'Payments': {
      const paymentId = ptRecord?.payment_id;
      const claimId =
        ptRecord?.payment_claim_id ||
        ptRecord?.paymentClaims?.payment_claim_id ||
        null;
      if (claimId && paymentId) {
        return `/user/claims/view/${claimId}?payment=${paymentId}`;
      }
      return paymentId ? `/user/payments-list` : null;
    }
    case 'ManualJournal':
    case 'Manual Journals':
    case 'ManualJournals': {
      // Phase 3 retention gross-up MJs don't have a standalone PT page —
      // they're surfaced inside the claim drawer. Link to the parent
      // claim when we can identify it from the joined PT record.
      const claimId =
        ptRecord?.payment_claim_id ||
        ptRecord?.paymentClaims?.payment_claim_id ||
        null;
      return claimId ? `/user/claims/view/${claimId}` : null;
    }
    case 'Contacts': {
      const id = ptDetails?.client_supplier_id;
      return id ? `/user/clients-suppliers/view/${id}` : null;
    }
    case 'Projects': {
      const id = ptDetails?.project_id;
      return id ? `/user/projects/view/${id}` : null;
    }
    case 'Contracts': {
      const id = ptDetails?.contract_id;
      return id ? `/user/contracts/overview/${id}` : null;
    }
    case 'Bank accounts': {
      const id = ptDetails?.bank_account_id;
      return id ? `/user/bank-accounts/overview/${id}` : null;
    }
    default:
      return null;
  }
}
