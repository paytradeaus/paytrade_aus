/**
 * Task #297 — Compliance cache freshness.
 *
 * Shared queue identifiers + job shape for the event-driven compliance
 * refresh pipeline. Keeping them in their own file avoids circular
 * imports between the producer (called from many write paths) and the
 * worker (called only inside CompliancesModule).
 */

export const COMPLIANCE_REFRESH_QUEUE = 'compliance-refresh';
export const COMPLIANCE_REFRESH_JOB = 'refresh-project-compliance';

/**
 * Debounce window. Many writes (e.g. matching a batch of transactions
 * or saving an audit/reconciliation report) fire several `markDirty`
 * calls in quick succession; coalescing them into one delayed job
 * means we recompute the project's compliance cache exactly once
 * instead of N times.
 */
export const COMPLIANCE_REFRESH_DEBOUNCE_MS = 5_000;

export interface ComplianceRefreshJob {
  project_id: number;
  /** Free-form audit string, e.g. "payment.confirmed" */
  trigger?: string;
}
