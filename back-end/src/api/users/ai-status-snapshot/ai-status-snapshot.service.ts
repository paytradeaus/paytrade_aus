import { Injectable } from '@nestjs/common';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import {
  PER_CATEGORY_CAP,
  SEVERITY_RANK,
  StatusIssue,
  StatusIssueCategory,
  StatusSnapshot,
  StatusSnapshotCategoryBlock,
  TOP_ISSUES_CAP,
} from './types';
import { ComplianceChecker } from './checkers/compliance.checker';
import { NoticesChecker } from './checkers/notices.checker';
import { ReconciliationChecker } from './checkers/reconciliation.checker';
import { PaymentsChecker } from './checkers/payments.checker';
import { ContractsChecker } from './checkers/contracts.checker';
import { ClaimsChecker } from './checkers/claims.checker';
import { ContactsChecker } from './checkers/contacts.checker';
import { SyncChecker } from './checkers/sync.checker';

interface CacheEntry {
  expiresAt: number;
  snapshot: StatusSnapshot;
}

const CACHE_TTL_MS = 60_000; // 60s — short enough to feel live, long enough to absorb dashboard refreshes

@Injectable()
export class AiStatusSnapshotService {
  private readonly logger = new PaytradeLogger('AI_STATUS_SNAPSHOT');
  private readonly cache = new Map<number, CacheEntry>();

  constructor(
    private readonly compliance: ComplianceChecker,
    private readonly notices: NoticesChecker,
    private readonly reconciliation: ReconciliationChecker,
    private readonly payments: PaymentsChecker,
    private readonly contracts: ContractsChecker,
    private readonly claims: ClaimsChecker,
    private readonly contacts: ContactsChecker,
    private readonly sync: SyncChecker,
  ) {}

  /**
   * Explicit cache invalidation hook for the future mutation-event system.
   * Call this when a mutation is known to have changed state for the company.
   */
  invalidate(companyId: number): void {
    this.cache.delete(companyId);
  }

  async getSnapshot(
    companyId: number,
    forceRefresh = false,
  ): Promise<StatusSnapshot> {
    const now = Date.now();
    if (!forceRefresh) {
      const cached = this.cache.get(companyId);
      if (cached && cached.expiresAt > now) return cached.snapshot;
    }

    const checkers: Array<[StatusIssueCategory, () => Promise<StatusIssue[]>]> = [
      ['compliance', () => this.compliance.check(companyId)],
      ['notices', () => this.notices.check(companyId)],
      ['reconciliation', () => this.reconciliation.check(companyId)],
      ['payments', () => this.payments.check(companyId)],
      ['contracts', () => this.contracts.check(companyId)],
      ['claims', () => this.claims.check(companyId)],
      ['contacts', () => this.contacts.check(companyId)],
      ['sync', () => this.sync.check(companyId)],
    ];

    const settled = await Promise.allSettled(checkers.map(([, fn]) => fn()));

    const categories: StatusSnapshotCategoryBlock[] = [];
    const allIssuesCapped: StatusIssue[] = [];
    // Severity totals are computed across the FULL checker output
    // (pre-cap) so the dashboard summary reflects real state, even when
    // a category has more findings than PER_CATEGORY_CAP.
    const summary = { critical: 0, warning: 0, info: 0, total: 0 };

    for (let i = 0; i < checkers.length; i++) {
      const [category] = checkers[i];
      const result = settled[i];
      if (result.status === 'rejected') {
        this.logger.error(
          `Checker '${category}' failed for company ${companyId}: ${result.reason?.message ?? result.reason}`,
        );
        categories.push({ category, totalFound: 0, issues: [], truncated: false });
        continue;
      }
      const found = (result.value ?? []).slice().sort(this.compareIssues);
      for (const issue of found) {
        if (issue.severity === 'critical') summary.critical += 1;
        else if (issue.severity === 'warning') summary.warning += 1;
        else summary.info += 1;
        summary.total += 1;
      }
      const capped = found.slice(0, PER_CATEGORY_CAP);
      categories.push({
        category,
        totalFound: found.length,
        issues: capped,
        truncated: found.length > capped.length,
      });
      allIssuesCapped.push(...capped);
    }

    allIssuesCapped.sort(this.compareIssues);
    const topIssues = allIssuesCapped.slice(0, TOP_ISSUES_CAP);

    const snapshot: StatusSnapshot = {
      companyId,
      generatedAt: new Date(now).toISOString(),
      summary,
      categories,
      topIssues,
    };

    this.cache.set(companyId, {
      expiresAt: now + CACHE_TTL_MS,
      snapshot,
    });
    return snapshot;
  }

  private compareIssues = (a: StatusIssue, b: StatusIssue): number => {
    const sa = SEVERITY_RANK[a.severity] ?? 99;
    const sb = SEVERITY_RANK[b.severity] ?? 99;
    if (sa !== sb) return sa - sb;
    return (b.detectedAt ?? '').localeCompare(a.detectedAt ?? '');
  };
}
