import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubPayments } from 'src/entities/sub-payments.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { PaymentsChecker } from './payments.checker';

describe('PaymentsChecker', () => {
  let checker: PaymentsChecker;
  let qb: any;
  beforeEach(async () => {
    qb = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentsChecker,
        { provide: getRepositoryToken(SubPayments), useValue: { createQueryBuilder: jest.fn().mockReturnValue(qb) } },
        { provide: getRepositoryToken(PaymentDetails), useValue: {} },
      ],
    }).compile();
    checker = moduleRef.get(PaymentsChecker);
  });

  it('scopes by company via PaymentDetails join and emits one issue per leg', async () => {
    qb.getMany.mockResolvedValue([
      { sub_payment_id: 1, payment_id: 11, sub_payment_type: 'PAID', status: 'Unmatched', updated_on: new Date() },
      { sub_payment_id: 2, payment_id: 12, sub_payment_type: 'RETENTION', status: 'Pending', updated_on: new Date() },
    ]);
    const issues = await checker.check(7);
    expect(issues).toHaveLength(2);
    expect(qb.innerJoin).toHaveBeenCalledWith(
      PaymentDetails,
      'pd',
      expect.stringContaining('pd.company_id'),
      { cid: 7 },
    );
    expect(issues[0].severity).toBe('warning');
    expect(issues[1].severity).toBe('info');
  });
});
