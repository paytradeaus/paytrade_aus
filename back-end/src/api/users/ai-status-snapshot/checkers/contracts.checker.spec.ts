import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { ContractsChecker } from './contracts.checker';

describe('ContractsChecker', () => {
  let checker: ContractsChecker;
  let qb: any;
  beforeEach(async () => {
    qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ContractsChecker,
        { provide: getRepositoryToken(ContractDetails), useValue: { createQueryBuilder: jest.fn().mockReturnValue(qb) } },
      ],
    }).compile();
    checker = moduleRef.get(ContractsChecker);
  });

  it('only emits when at least one required field is missing', async () => {
    qb.getMany.mockResolvedValue([
      { contract_id: 1, client_supplier_id: 5, initial_contract_sum: 1000, contract_start_date: new Date(), payment_terms: 30, updated_on: new Date() },
      { contract_id: 2, client_supplier_id: null, initial_contract_sum: 0, contract_start_date: null, payment_terms: null, updated_on: new Date() },
    ]);
    const issues = await checker.check(7);
    expect(issues).toHaveLength(1);
    expect(issues[0].affectedRecordId).toBe(2);
    expect(issues[0].description).toContain('counterparty');
  });
});
