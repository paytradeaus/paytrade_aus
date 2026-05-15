import { AiStatusSnapshotResolver } from './ai-status-snapshot.resolver';

describe('AiStatusSnapshotResolver auth enforcement', () => {
  const makeContext = (headers: Record<string, string> = {}) => ({ req: { headers } } as any);

  it('returns ERROR when company_id is missing', async () => {
    const resolver = new AiStatusSnapshotResolver(
      { decodeJwtToken: jest.fn().mockResolvedValue({ companySpecificRoles: [{ companyId: 1, role: 'ADMIN' }] }) } as any,
      { getSnapshot: jest.fn() } as any,
    );
    const res = await resolver.getAiStatusSnapshot(makeContext(), { company_id: 0 } as any);
    expect(res.status).toBe('ERROR');
  });

  it('returns ERROR when caller has no role on the requested company (IDOR guard)', async () => {
    const decode = jest.fn().mockResolvedValue({ companySpecificRoles: [{ companyId: 5, role: 'ADMIN' }] });
    const getSnapshot = jest.fn();
    const resolver = new AiStatusSnapshotResolver(
      { decodeJwtToken: decode } as any,
      { getSnapshot } as any,
    );
    const res = await resolver.getAiStatusSnapshot(makeContext(), { company_id: 9 } as any);
    expect(res.status).toBe('ERROR');
    expect(getSnapshot).not.toHaveBeenCalled();
  });

  it('returns SUCCESS when caller has an allowed role on the company', async () => {
    const decode = jest.fn().mockResolvedValue({
      userId: 1,
      companySpecificRoles: [{ companyId: 9, role: 'STANDARD USER' }],
    });
    const getSnapshot = jest.fn().mockResolvedValue({
      companyId: 9,
      generatedAt: new Date().toISOString(),
      summary: { critical: 0, warning: 0, info: 0, total: 0 },
      categories: [],
      topIssues: [],
    });
    const resolver = new AiStatusSnapshotResolver(
      { decodeJwtToken: decode } as any,
      { getSnapshot } as any,
    );
    const res = await resolver.getAiStatusSnapshot(makeContext(), { company_id: 9 } as any);
    expect(res.status).toBe('SUCCESS');
    expect(getSnapshot).toHaveBeenCalledWith(9, false);
  });
});
