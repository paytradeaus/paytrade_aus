/**
 * Task #41 — Supplier bill-code resolver.
 *
 * Picks the Xero account code that should be used on the base ("service")
 * line of a bill for a given supplier, optionally scoped to a project.
 *
 * Resolution order:
 *   1. project override (supplier × project)
 *   2. supplier default override
 *   3. naming-convention auto-discovery against the Xero chart of accounts
 *      (only when `direction === 'inbound'` AND a CoA list is supplied)
 *   4. company fallback `xeroDetails.bill_code`
 *      — only when variable mode is OFF, OR variable mode is ON AND
 *        `bill_code_allow_fallback === true`.
 *   5. otherwise → `unresolved` (caller must surface the new sync log /
 *      block the outbound push).
 *
 * The function is pure — it reads no IO. Callers are responsible for
 * fetching the per-project / supplier overrides and (inbound only) the
 * Xero chart of accounts list. When `autoLearned` is set, the inbound
 * caller MUST persist it (writing either a per-project override row or
 * the supplier-default column) so future syncs hit the cache and emit
 * the warning sync log.
 */

export type ResolverDirection = 'inbound' | 'outbound';

export type ResolverSource =
  | 'project'
  | 'supplier_default'
  | 'naming_convention'
  | 'fallback'
  | 'unresolved';

export interface SupplierLike {
  client_supplier_id?: number | null;
  xero_default_account_code?: string | null;
}

export interface XeroVariableBillCodeFields {
  bill_code?: string | null;
  bill_code_is_variable?: boolean | null;
  bill_code_naming_convention?: string | null;
  bill_code_allow_fallback?: boolean | null;
}

export interface ProjectAccountCodeOverride {
  project_id: number;
  account_code: string;
}

export interface XeroAccount {
  code?: string | null;
  name?: string | null;
  status?: string | null;
  type?: string | null;
}

export interface ResolveSupplierBillCodeInput {
  supplier: SupplierLike | null | undefined;
  projectId?: number | null;
  xeroDetails: XeroVariableBillCodeFields | null | undefined;
  projectOverrides?: ProjectAccountCodeOverride[];
  xeroChartOfAccounts?: XeroAccount[];
  direction: ResolverDirection;
  /**
   * When non-null, restricts naming-convention discovery to accounts
   * matching this code (e.g. when the inbound webhook has a candidate
   * `accountCode` we want to match against the CoA name). Optional.
   */
  candidateAccountCode?: string | null;
}

export interface ResolveSupplierBillCodeResult {
  accountCode: string | null;
  source: ResolverSource;
  /**
   * Only set for `naming_convention` outcomes. Inbound caller should
   * persist this to either the project override table (when projectId
   * is set) or the supplier default column.
   */
  autoLearned?: {
    projectId: number | null;
    accountCode: string;
  };
}

const isBlank = (v: string | null | undefined): boolean => {
  if (v === null || v === undefined) return true;
  return String(v).trim().length === 0;
};

export function resolveSupplierBillCode(
  input: ResolveSupplierBillCodeInput,
): ResolveSupplierBillCodeResult {
  const {
    supplier,
    projectId,
    xeroDetails,
    projectOverrides = [],
    xeroChartOfAccounts = [],
    direction,
    candidateAccountCode,
  } = input;

  const isVariable = !!xeroDetails?.bill_code_is_variable;
  const allowFallback = isVariable
    ? xeroDetails?.bill_code_allow_fallback !== false
    : true;
  const fallback = xeroDetails?.bill_code || null;

  // 1. Project-specific override
  if (projectId !== null && projectId !== undefined && projectOverrides.length > 0) {
    const hit = projectOverrides.find(
      (po) => po.project_id === projectId && !isBlank(po.account_code),
    );
    if (hit) {
      return { accountCode: hit.account_code.trim(), source: 'project' };
    }
  }

  // 2. Supplier default
  if (supplier && !isBlank(supplier.xero_default_account_code)) {
    return {
      accountCode: String(supplier.xero_default_account_code).trim(),
      source: 'supplier_default',
    };
  }

  // 3. Naming-convention auto-discovery (inbound only)
  if (
    direction === 'inbound' &&
    xeroDetails?.bill_code_naming_convention &&
    xeroChartOfAccounts.length > 0
  ) {
    const needle = String(xeroDetails.bill_code_naming_convention)
      .trim()
      .toLowerCase();
    if (needle.length > 0) {
      // Prefer the candidate code (the line accountCode the webhook
      // actually arrived with) if it both exists in the CoA AND its
      // account name matches the naming convention.
      const candidate = candidateAccountCode
        ? String(candidateAccountCode).trim()
        : null;
      if (candidate) {
        const acc = xeroChartOfAccounts.find(
          (a) => String(a?.code || '').trim() === candidate,
        );
        if (acc && String(acc.name || '').toLowerCase().includes(needle)) {
          return {
            accountCode: candidate,
            source: 'naming_convention',
            autoLearned: {
              projectId: projectId ?? null,
              accountCode: candidate,
            },
          };
        }
      }
      // Otherwise, scan the CoA for any active EXPENSE account whose
      // name contains the naming convention. Returns the first match;
      // ambiguous matches still produce a usable code (caller logs it).
      // Restricting to type === EXPENSE / DIRECTCOSTS / OVERHEADS
      // prevents auto-learning a bank or revenue code by accident.
      const expenseTypes = new Set([
        'EXPENSE',
        'DIRECTCOSTS',
        'OVERHEADS',
        'DEPRECIATN',
      ]);
      const match = xeroChartOfAccounts.find((a) => {
        const name = String(a?.name || '').toLowerCase();
        const status = String(a?.status || '').toUpperCase();
        const type = String(a?.type || '').toUpperCase();
        if (status && status !== 'ACTIVE') return false;
        if (type && !expenseTypes.has(type)) return false;
        return name.includes(needle);
      });
      if (match && !isBlank(match.code)) {
        const code = String(match.code).trim();
        return {
          accountCode: code,
          source: 'naming_convention',
          autoLearned: {
            projectId: projectId ?? null,
            accountCode: code,
          },
        };
      }
    }
  }

  // 4. Fallback
  if (!isBlank(fallback) && allowFallback) {
    return { accountCode: String(fallback).trim(), source: 'fallback' };
  }

  // 5. Unresolved
  return { accountCode: null, source: 'unresolved' };
}
