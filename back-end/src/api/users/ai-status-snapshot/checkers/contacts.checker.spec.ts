import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { ContactsChecker } from './contacts.checker';

describe('ContactsChecker', () => {
  let checker: ContactsChecker;
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
        ContactsChecker,
        { provide: getRepositoryToken(ClientSuppliersDetails), useValue: { createQueryBuilder: jest.fn().mockReturnValue(qb) } },
      ],
    }).compile();
    checker = moduleRef.get(ContactsChecker);
  });

  it('flagged needs_email becomes warning, plain missing email becomes info', async () => {
    qb.getMany.mockResolvedValue([
      { client_supplier_id: 1, business_name: 'Acme', needs_email: true, client_email_id: null, updated_on: new Date() },
      { client_supplier_id: 2, business_name: 'Beta', needs_email: false, client_email_id: '', updated_on: new Date() },
    ]);
    const issues = await checker.check(7);
    expect(issues.find((i) => i.affectedRecordId === 1)?.severity).toBe('warning');
    expect(issues.find((i) => i.affectedRecordId === 2)?.severity).toBe('info');
  });
});
