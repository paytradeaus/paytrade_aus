import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { NoticesChecker } from './notices.checker';

describe('NoticesChecker', () => {
  let checker: NoticesChecker;
  let qb: { select: jest.Mock; where: jest.Mock; andWhere: jest.Mock; orderBy: jest.Mock; limit: jest.Mock; getMany: jest.Mock };
  beforeEach(async () => {
    qb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        NoticesChecker,
        {
          provide: getRepositoryToken(NoticeDetails),
          useValue: { createQueryBuilder: jest.fn().mockReturnValue(qb) },
        },
      ],
    }).compile();
    checker = moduleRef.get(NoticesChecker);
  });

  it('marks Sending notices as critical, others as warning', async () => {
    qb.getMany.mockResolvedValue([
      { id: 'a', notice_id: 1, notice_type: 'Payment', status: 'Sending', project_id: 1, updated_on: new Date() },
      { id: 'b', notice_id: 2, notice_type: 'Payment', status: 'Draft', project_id: 1, updated_on: new Date() },
    ]);
    const issues = await checker.check(7);
    expect(issues).toHaveLength(2);
    expect(issues.find((i) => i.title.includes('stuck'))?.severity).toBe('critical');
    expect(issues.find((i) => i.title.includes('Unsent'))?.severity).toBe('warning');
  });

  it('returns [] when no unsent notices', async () => {
    qb.getMany.mockResolvedValue([]);
    expect(await checker.check(7)).toEqual([]);
  });
});
