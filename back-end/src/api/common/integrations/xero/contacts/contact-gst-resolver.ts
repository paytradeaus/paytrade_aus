/**
 * Phase 2 contact GST resolver.
 *
 * Picks the effective Xero tax type for a claim line, given a PayTrade
 * contact, the claim type ("Receivable" / "Billable" / "Payable"), and the
 * cached organisation defaults from `xero_integration_details`.
 *
 * Resolution order (first non-blank wins):
 *   1. Per-contact override on `client_suppliers_details`
 *      (`xero_sales_gst_setting` for sales, `xero_purchases_gst_setting`
 *      for purchases). The sentinel value "Use organisation settings"
 *      and blank/null are treated as "fall through".
 *   2. Cached Xero org default (`xero_org_default_sales_tax` /
 *      `xero_org_default_purchases_tax`).
 *   3. PayTrade-side fallback derived from `company_details.is_gst_registered`:
 *        true  → "GST on Income" / "GST on Expenses"
 *        false → "BAS Excluded"
 *   4. Final fallback: { taxType: null, source: 'unknown' } — caller
 *      should treat as "GST not determinable".
 */

export type ClaimType = 'Receivable' | 'Billable' | 'Payable' | string;

export interface ContactGstFields {
  xero_sales_gst_setting?: string | null;
  xero_purchases_gst_setting?: string | null;
}

export interface OrgGstDefaults {
  xero_org_default_sales_tax?: string | null;
  xero_org_default_purchases_tax?: string | null;
}

export interface CompanyGstFields {
  is_gst_registered?: boolean | null;
}

export interface ResolvedContactGst {
  /** Effective Xero tax type, or null if it could not be determined. */
  taxType: string | null;
  /** Where the value came from. */
  source:
    | 'contact'
    | 'xero_org_default'
    | 'company_is_gst_registered'
    | 'unknown';
  /** True only when source !== 'unknown'. */
  resolved: boolean;
}

const ORG_SENTINEL = 'use organisation settings';

const isBlank = (v: string | null | undefined): boolean => {
  if (v === null || v === undefined) return true;
  const s = String(v).trim();
  if (!s) return true;
  return s.toLowerCase() === ORG_SENTINEL;
};

const isSalesClaim = (claimType: ClaimType): boolean => {
  // PayTrade uses "Receivable" for money-in (sales/invoices) and
  // "Billable"/"Payable" for money-out (purchases/bills).
  if (!claimType) return false;
  return String(claimType).toLowerCase() === 'receivable';
};

export function resolveContactGstStatus(
  contact: ContactGstFields | null | undefined,
  claimType: ClaimType,
  orgDefaults?: OrgGstDefaults | null,
  company?: CompanyGstFields | null,
): ResolvedContactGst {
  const sales = isSalesClaim(claimType);

  const contactValue = sales
    ? contact?.xero_sales_gst_setting
    : contact?.xero_purchases_gst_setting;
  if (!isBlank(contactValue)) {
    return { taxType: String(contactValue).trim(), source: 'contact', resolved: true };
  }

  const orgValue = sales
    ? orgDefaults?.xero_org_default_sales_tax
    : orgDefaults?.xero_org_default_purchases_tax;
  if (!isBlank(orgValue)) {
    return {
      taxType: String(orgValue).trim(),
      source: 'xero_org_default',
      resolved: true,
    };
  }

  if (company && company.is_gst_registered !== null && company.is_gst_registered !== undefined) {
    // Fallback values are canonical Xero TaxType codes (OUTPUT = GST on
    // Income, INPUT = GST on Expenses, BASEXCLUDED = BAS Excluded), not
    // the human labels — these flow straight into Xero API payloads.
    if (company.is_gst_registered === true) {
      return {
        taxType: sales ? 'OUTPUT' : 'INPUT',
        source: 'company_is_gst_registered',
        resolved: true,
      };
    }
    if (company.is_gst_registered === false) {
      return {
        taxType: 'BASEXCLUDED',
        source: 'company_is_gst_registered',
        resolved: true,
      };
    }
  }

  return { taxType: null, source: 'unknown', resolved: false };
}
