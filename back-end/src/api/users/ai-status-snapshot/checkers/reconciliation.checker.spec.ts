import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReconciliationReport } from 'src/entities/reconciliation-report.entity';
import { ReconciliationChecker } from './reconciliation.checker';

describe('ReconciliationChecker', () => {
  let checker: ReconciliationChecker;
  let qb: any;
  let andWhereCalls: string[];

  beforeEach(async () => {
    andWhereCalls = [];
    qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn(function (this: any, expr: string) {
        andWhereCalls.push(expr);
        return this;
      }),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ReconciliationChecker,
        {
          provide: getRepositoryToken(ReconciliationReport),
          useValue: { createQueryBuilder: jest.fn().mockReturnValue(qb) },
        },
      ],
    }).compile();
    checker = moduleRef.get(ReconciliationChecker);
  });

  it('only queries Active + Unbalanced reports (real entity enums)', async () => {
    qb.getMany.mockResolvedValue([]);
    await checker.check(1);
    expect(andWhereCalls).toEqual(
      expect.arrayContaining([
        expect.stringContaining("r.report_status = 'Active'"),
        expect.stringContaining("r.reconcile_status = 'Unbalanced'"),
      ]),
    );
  });

  it('flags reports older than 35 days (by month_end_date) as critical, others warning', async () => {
    const oldEnd = new Date(Date.now() - 60 * 86400000);
    const recentEnd = new Date(Date.now() - 5 * 86400000);
    qb.getMany.mockResolvedValue([
      {
        report_id: 1,
        month_end_date: oldEnd,
        reconcile_status: 'Unbalanced',
        report_status: 'Active',
        updated_on: oldEnd,
      },
      {
        report_id: 2,
        month_end_date: recentEnd,
        reconcile_status: 'Unbalanced',
        report_status: 'Active',
        updated_on: recentEnd,
      },
    ]);
    const issues = await checker.check(1);
    expect(issues.find((i) => i.id.includes(':overdue'))?.severity).toBe('critical');
    expect(issues.find((i) => i.id.includes(':unbalanced'))?.severity).toBe('warning');
  });
});
