import { AiStatusSnapshotService } from './ai-status-snapshot.service';
import { StatusIssue, StatusIssueCategory } from './types';

function issue(
  category: StatusIssueCategory,
  severity: StatusIssue['severity'],
  idSuffix: string,
): StatusIssue {
  return {
    id: `${category}:test:${idSuffix}`,
    category,
    severity,
    title: `t-${idSuffix}`,
    description: 'd',
    affectedRecordType: 'project',
    affectedRecordId: 1,
    suggestedAction: 'do thing',
    agentCanHelp: false,
    requiresApproval: true,
    detectedAt: new Date().toISOString(),
  };
}

describe('AiStatusSnapshotService', () => {
  const stubChecker = (issues: StatusIssue[]) => ({ check: jest.fn().mockResolvedValue(issues) });

  function build(checkers: { [k in StatusIssueCategory]?: StatusIssue[] }) {
    return new AiStatusSnapshotService(
      stubChecker(checkers.compliance ?? []) as any,
      stubChecker(checkers.notices ?? []) as any,
      stubChecker(checkers.reconciliation ?? []) as any,
      stubChecker(checkers.payments ?? []) as any,
      stubChecker(checkers.contracts ?? []) as any,
      stubChecker(checkers.claims ?? []) as any,
      stubChecker(checkers.contacts ?? []) as any,
      stubChecker(checkers.sync ?? []) as any,
    );
  }

  it('aggregates issues across categories with severity-sorted topIssues', async () => {
    const svc = build({
      compliance: [issue('compliance', 'critical', 'a'), issue('compliance', 'info', 'b')],
      notices: [issue('notices', 'warning', 'c')],
    });
    const snap = await svc.getSnapshot(1);
    expect(snap.summary.total).toBe(3);
    expect(snap.summary.critical).toBe(1);
    expect(snap.summary.warning).toBe(1);
    expect(snap.summary.info).toBe(1);
    expect(snap.topIssues[0].severity).toBe('critical');
  });

  it('caches snapshot for 60s and invalidates on demand', async () => {
    const svc = build({ compliance: [issue('compliance', 'info', '1')] });
    const a = await svc.getSnapshot(42);
    const b = await svc.getSnapshot(42);
    expect(a).toBe(b); // identity from cache
    svc.invalidate(42);
    const c = await svc.getSnapshot(42);
    expect(c).not.toBe(a);
  });

  it('forceRefresh bypasses cache', async () => {
    const svc = build({ compliance: [issue('compliance', 'info', '1')] });
    const a = await svc.getSnapshot(1);
    const b = await svc.getSnapshot(1, true);
    expect(b).not.toBe(a);
  });

  it('isolates failure of a single checker via Promise.allSettled', async () => {
    const failing = { check: jest.fn().mockRejectedValue(new Error('boom')) };
    const svc = new AiStatusSnapshotService(
      failing as any,
      stubChecker([issue('notices', 'warning', 'n')]) as any,
      stubChecker([]) as any,
      stubChecker([]) as any,
      stubChecker([]) as any,
      stubChecker([]) as any,
      stubChecker([]) as any,
      stubChecker([]) as any,
    );
    const snap = await svc.getSnapshot(1);
    const compBlock = snap.categories.find((c) => c.category === 'compliance');
    expect(compBlock?.totalFound).toBe(0);
    expect(snap.summary.warning).toBe(1);
  });

  it('caps per-category at PER_CATEGORY_CAP and marks truncated', async () => {
    const many = Array.from({ length: 30 }, (_, i) => issue('compliance', 'info', String(i)));
    const svc = build({ compliance: many });
    const snap = await svc.getSnapshot(1);
    const block = snap.categories.find((c) => c.category === 'compliance');
    expect(block?.issues.length).toBe(25);
    expect(block?.truncated).toBe(true);
    expect(block?.totalFound).toBe(30);
  });

  it('summary counts severities from FULL findings, not the capped issue list', async () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      issue('compliance', i % 4 === 0 ? 'critical' : 'info', String(i)),
    );
    const svc = build({ compliance: many });
    const snap = await svc.getSnapshot(1);
    expect(snap.summary.total).toBe(40);
    expect(snap.summary.critical).toBe(10);
    expect(snap.summary.info).toBe(30);
    expect(snap.categories[0].issues.length).toBe(25);
  });
});
