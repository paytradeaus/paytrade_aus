import { AiChatInspectionService } from '../services/inspection.service';

/**
 * Task #202 — proves the inspection service refuses cross-company
 * reads. The model can pass any `companyId`, but every method must
 * re-validate membership against `company_user_roles` using the
 * JWT-derived `userId`.
 */
describe('AiChatInspectionService', () => {
  function makeService(opts: {
    membership?: { user_id: number; company_id: number; company_role?: string } | null;
    claims?: any[];
    contacts?: any[];
  }) {
    const userRolesRepo = {
      findOne: jest.fn().mockResolvedValue(opts.membership ?? null),
    };
    const qb = (rows: any[], oneRow?: any) => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(rows),
      getOne: jest.fn().mockResolvedValue(oneRow ?? null),
    });
    const claimRepo = {
      createQueryBuilder: jest.fn(() => qb(opts.claims ?? [], (opts.claims ?? [])[0])),
    };
    const contactRepo = {
      createQueryBuilder: jest.fn(() => qb(opts.contacts ?? [])),
    };
    const emptyRepo = () => ({
      createQueryBuilder: jest.fn(() => qb([])),
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
    });

    const svc = new AiChatInspectionService(
      claimRepo as any,
      contactRepo as any,
      emptyRepo() as any, // contractRepo
      emptyRepo() as any, // projectRepo
      userRolesRepo as any,
      emptyRepo() as any, // retentionRepo
      emptyRepo() as any, // bankAccountRepo
      emptyRepo() as any, // xeroIntegrationRepo
      emptyRepo() as any, // xeroSyncLogRepo
    );
    return { svc, userRolesRepo, claimRepo, contactRepo };
  }

  it('rejects listClaimsWithIssues when user has no role on the company', async () => {
    const { svc, claimRepo } = makeService({ membership: null });
    await expect(svc.listClaimsWithIssues(7, 42)).rejects.toThrow(
      /not a member of company 42/i,
    );
    // Ensures we never even hit the claims table.
    expect(claimRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('rejects getClaimDetails when user has no role on the company', async () => {
    const { svc, claimRepo } = makeService({ membership: null });
    await expect(svc.getClaimDetails(7, 42, 99)).rejects.toThrow(
      /not a member of company 42/i,
    );
    expect(claimRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('rejects listContactsMissingDetails when user has no role on the company', async () => {
    const { svc, contactRepo } = makeService({ membership: null });
    await expect(svc.listContactsMissingDetails(7, 42)).rejects.toThrow(
      /not a member of company 42/i,
    );
    expect(contactRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('rejects when the user has a role but it is not on the allowed list', async () => {
    const { svc } = makeService({
      membership: { user_id: 7, company_id: 42, company_role: 'BANNED ROLE' },
    });
    await expect(svc.listClaimsWithIssues(7, 42)).rejects.toThrow(
      /does not permit reads/i,
    );
  });

  it('allows access when membership and role check pass', async () => {
    const { svc, userRolesRepo } = makeService({
      membership: { user_id: 7, company_id: 42, company_role: 'ADMIN' },
      claims: [],
    });
    const out = await svc.listClaimsWithIssues(7, 42);
    expect(out).toEqual([]);
    expect(userRolesRepo.findOne).toHaveBeenCalledWith({
      where: { user_id: 7, company_id: 42 },
    });
  });
});
