/**
 * Deterministic AI Status Snapshot — typed contract.
 *
 * This module owns the cross-system contract used by:
 *   - the snapshot service & per-category checkers (back-end)
 *   - the future read-only AI chat agent (which will SUMMARISE, never invent)
 *   - the dashboard "System Status Summary" card (front-end)
 *
 * The contract is intentionally narrow: every issue must be derivable from
 * a real backend query so the AI layer can never hallucinate items.
 */

export type StatusIssueSeverity = 'critical' | 'warning' | 'info';

export type StatusIssueCategory =
  | 'compliance'
  | 'notices'
  | 'reconciliation'
  | 'payments'
  | 'contracts'
  | 'claims'
  | 'contacts'
  | 'sync';

/**
 * The entity-type-ish label of the record an issue points at. Used by the
 * future AI agent to deep-link into the correct screen, and by the UI to
 * render the right icon/route for the "View" action.
 */
export type StatusIssueRecordType =
  | 'project'
  | 'notice'
  | 'reconciliation_report'
  | 'payment'
  | 'sub_payment'
  | 'contract'
  | 'payment_claim'
  | 'client_supplier'
  | 'xero_sync_log'
  | 'audit_report'
  | 'bank_account'
  | 'company';

export interface StatusIssue {
  /** Stable id of the form `<category>:<record_type>:<record_id>:<check>`. */
  id: string;
  category: StatusIssueCategory;
  severity: StatusIssueSeverity;
  /** Short, user-facing title. */
  title: string;
  /** One-sentence factual description. NEVER speculative. */
  description: string;
  /** The backend record this issue points at. */
  affectedRecordType: StatusIssueRecordType;
  /** Numeric or string id of the affected record (string for uuid columns). */
  affectedRecordId: string | number | null;
  /** Optional grouping id — typically the parent project_id when relevant. */
  projectId?: number | null;
  /** Plain-language next step the user can take. */
  suggestedAction: string;
  /**
   * True when the future AI agent has a concrete tool/flow to help resolve.
   * For now most are false; the chat task will flip these on as tools land.
   */
  agentCanHelp: boolean;
  /** True when the resolution requires explicit user approval (writes data). */
  requiresApproval: boolean;
  /** ISO timestamp of the underlying record's most recent state change. */
  detectedAt: string;
}

export interface StatusSnapshotSummary {
  critical: number;
  warning: number;
  info: number;
  total: number;
}

export interface StatusSnapshotCategoryBlock {
  category: StatusIssueCategory;
  /** Total found by the checker (may exceed `issues.length` after capping). */
  totalFound: number;
  /** Issues actually returned (capped per category). */
  issues: StatusIssue[];
  /** True when totalFound > issues.length. */
  truncated: boolean;
}

export interface StatusSnapshot {
  companyId: number;
  generatedAt: string;
  summary: StatusSnapshotSummary;
  categories: StatusSnapshotCategoryBlock[];
  /** Top issues across categories (sorted by severity), capped. */
  topIssues: StatusIssue[];
}

export const SEVERITY_RANK: Record<StatusIssueSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

/** Per-category issue cap for bounded payloads. */
export const PER_CATEGORY_CAP = 25;
/** Cross-category top-issues cap for the dashboard card / chat preview. */
export const TOP_ISSUES_CAP = 50;
