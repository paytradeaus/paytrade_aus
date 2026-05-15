import { ForbiddenException } from '@nestjs/common';

export interface CompanyRole {
  companyId: number;
  role: string;
  manageCompany?: string;
  isSystemAdded?: boolean;
}

export interface DecodedJwtPayload {
  userId?: number;
  emailId?: string;
  isAdmin?: boolean;
  companySpecificRoles?: CompanyRole[];
  exp?: number;
  iat?: number;
}

const ALLOWED_ROLES = new Set([
  'PRIMARY ADMIN',
  'ADMIN',
  'STANDARD USER',
  'PORTAL ADMIN',
  'RESTRICTED PORTAL ADMIN',
]);

export function assertCompanyAccess(
  decoded: DecodedJwtPayload | null | undefined,
  companyId: number,
): void {
  if (!decoded) {
    throw new ForbiddenException('Authorization required');
  }

  if (decoded.isAdmin) {
    return;
  }

  const roles = decoded.companySpecificRoles ?? [];
  const matching = roles.filter(
    (r) => r && Number(r.companyId) === Number(companyId),
  );
  if (matching.length === 0) {
    throw new ForbiddenException(
      'Access denied: caller has no role on the requested company.',
    );
  }
  const allowed = matching.some(
    (r) => typeof r.role === 'string' && ALLOWED_ROLES.has(r.role),
  );
  if (!allowed) {
    throw new ForbiddenException(
      'Access denied: caller role does not permit reading the snapshot.',
    );
  }
}
