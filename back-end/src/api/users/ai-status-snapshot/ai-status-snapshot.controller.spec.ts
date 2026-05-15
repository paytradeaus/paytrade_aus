import { ForbiddenException, HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AiStatusSnapshotController } from './ai-status-snapshot.controller';
import { AiStatusSnapshotService } from './ai-status-snapshot.service';

describe('AiStatusSnapshotController', () => {
  let controller: AiStatusSnapshotController;
  let snapshotService: { getSnapshot: jest.Mock };
  let jwtService: { verify: jest.Mock };

  const makeReq = (companyHeader?: string) => ({
    headers: companyHeader ? { companyid: companyHeader } : {},
  }) as any;

  beforeEach(() => {
    snapshotService = { getSnapshot: jest.fn() };
    jwtService = { verify: jest.fn() };
    controller = new AiStatusSnapshotController(
      snapshotService as unknown as AiStatusSnapshotService,
      jwtService as unknown as JwtService,
    );
  });

  it('rejects when no Bearer token is supplied', async () => {
    await expect(
      controller.getStatusSnapshot(makeReq(), undefined, '1', undefined),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects when company_id query param is missing/invalid', async () => {
    jwtService.verify.mockReturnValue({ companySpecificRoles: [{ companyId: 1, role: 'ADMIN' }] });
    await expect(
      controller.getStatusSnapshot(makeReq(), 'Bearer x', undefined, undefined),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('rejects when caller has no role on requested company', async () => {
    jwtService.verify.mockReturnValue({ companySpecificRoles: [{ companyId: 2, role: 'ADMIN' }] });
    await expect(
      controller.getStatusSnapshot(makeReq(), 'Bearer x', '7', undefined),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects when companyid header disagrees with query param', async () => {
    jwtService.verify.mockReturnValue({ companySpecificRoles: [{ companyId: 7, role: 'ADMIN' }] });
    await expect(
      controller.getStatusSnapshot(makeReq('9'), 'Bearer x', '7', undefined),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns snapshot when authorised', async () => {
    jwtService.verify.mockReturnValue({ userId: 1, companySpecificRoles: [{ companyId: 7, role: 'ADMIN' }] });
    snapshotService.getSnapshot.mockResolvedValue({ summary: { total: 0, critical: 0, warning: 0, info: 0 }, companyId: 7 });
    const result = await controller.getStatusSnapshot(makeReq('7'), 'Bearer x', '7', 'true');
    expect(result.status).toBe('SUCCESS');
    expect(snapshotService.getSnapshot).toHaveBeenCalledWith(7, true);
  });
});
