import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentClaims } from 'src/entities/banking.entity';
import { ClaimsChecker } from './claims.checker';

describe('ClaimsChecker', () => {
  let checker: ClaimsChecker;
  let qb: any;
  beforeEach(async () => {
    qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ClaimsChecker,
        { provide: getRepositoryToken(PaymentClaims), useValue: { createQueryBuilder: jest.fn().mockReturnValue(qb) } },
      ],
    }).compile();
    checker = moduleRef.get(ClaimsChecker);
  });

  it('emits critical when cash_retention=true and retention_amount missing', async () => {
    qb.getMany.mockResolvedValue([
      { payment_claim_id: 1, cash_retention: true, retention_amount: 0, status: 'Open', updated_on: new Date() },
    ]);
    const issues = await checker.check(7);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('critical');
    expect(issues[0].id).toContain('retention_missing');
  });

  it('emits overdue (critical at 14d+, warning under)', async () => {
    const due20 = new Date(Date.now() - 20 * 86400000);
    const due3 = new Date(Date.now() - 3 * 86400000);
    qb.getMany.mockResolvedValue([
      { payment_claim_id: 2, cash_retention: false, due_date: due20, status: 'Open', updated_on: new Date() },
      { payment_claim_id: 3, cash_retention: false, due_date: due3, status: 'Open', updated_on: new Date() },
    ]);
    const issues = await checker.check(7);
    expect(issues.find((i) => i.id.includes(':2:overdue'))?.severity).toBe('critical');
    expect(issues.find((i) => i.id.includes(':3:overdue'))?.severity).toBe('warning');
  });
});
