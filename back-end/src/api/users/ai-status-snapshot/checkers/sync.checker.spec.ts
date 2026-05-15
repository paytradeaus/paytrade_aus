import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { XeroSyncLogs } from 'src/entities/xero-sync-logs.entity';
import { SyncChecker } from './sync.checker';

describe('SyncChecker', () => {
  let checker: SyncChecker;
  let qb: any;
  beforeEach(async () => {
    qb = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        SyncChecker,
        { provide: getRepositoryToken(XeroSyncLogs), useValue: { createQueryBuilder: jest.fn().mockReturnValue(qb) } },
      ],
    }).compile();
    checker = moduleRef.get(SyncChecker);
  });

  it('scopes via XeroIntegrationDetails join and gates Failed via XeroLogTemplates', async () => {
    qb.getMany.mockResolvedValue([
      { id: 'u1', sync_id: 100, error_code: 'AUTH', error_message: 'token expired', created_on: new Date() },
    ]);
    const issues = await checker.check(7);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('critical');
    expect(qb.innerJoin).toHaveBeenCalledTimes(2);
    const joinCalls = qb.innerJoin.mock.calls.map((c: unknown[]) => c[2] as string);
    expect(joinCalls.some((s) => s.includes('xi.company_id'))).toBe(true);
    expect(joinCalls.some((s) => s.includes("xt.sync_status = 'Failed'"))).toBe(true);
  });
});
