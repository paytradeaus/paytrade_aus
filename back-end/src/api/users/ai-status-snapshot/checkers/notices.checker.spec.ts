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

  it('skips fresh Sending notices (delegated lodgement in flight), keeps Draft warning', async () => {
    qb.getMany.mockResolvedValue([
      { id: 'a', notice_id: 1, notice_type: 'Payment', status: 'Sending', project_id: 1, updated_on: new Date() },
      { id: 'b', notice_id: 2, notice_type: 'Payment', status: 'Draft', project_id: 1, updated_on: new Date() },
    ]);
    const issues = await checker.check(7);
    expect(issues).toHaveLength(1);
    expect(issues[0].title).toContain('Unsent');
    expect(issues[0].severity).toBe('warning');
  });

  it('marks Sending notices older than the grace period as critical', async () => {
    const fourDaysAgo = new Date(Date.now() - 4 * 86400000);
    qb.getMany.mockResolvedValue([
      { id: 'a', notice_id: 1, notice_type: 'Payment', status: 'Sending', project_id: 1, updated_on: fourDaysAgo },
    ]);
    const issues = await checker.check(7);
    expect(issues).toHaveLength(1);
    expect(issues[0].title).toContain('stuck');
    expect(issues[0].severity).toBe('critical');
  });

  it('does not flag Sending at just under the 3-day boundary', async () => {
    const justUnder = new Date(Date.now() - (3 * 86400000 - 60000));
    qb.getMany.mockResolvedValue([
      { id: 'a', notice_id: 1, notice_type: 'Payment', status: 'Sending', project_id: 1, updated_on: justUnder },
    ]);
    expect(await checker.check(7)).toEqual([]);
  });

  it('returns [] when no unsent notices', async () => {
    qb.getMany.mockResolvedValue([]);
    expect(await checker.check(7)).toEqual([]);
  });
});
