import { ForbiddenException } from '@nestjs/common';
import { assertCompanyAccess, DecodedJwtPayload } from './auth-helper';

describe('assertCompanyAccess', () => {
  it('throws when decoded payload is missing', () => {
    expect(() => assertCompanyAccess(null, 1)).toThrow(ForbiddenException);
    expect(() => assertCompanyAccess(undefined, 1)).toThrow(ForbiddenException);
  });

  it('allows admins regardless of companySpecificRoles', () => {
    const decoded: DecodedJwtPayload = { isAdmin: true };
    expect(() => assertCompanyAccess(decoded, 42)).not.toThrow();
  });

  it('throws when caller has no role on the requested company', () => {
    const decoded: DecodedJwtPayload = {
      companySpecificRoles: [{ companyId: 7, role: 'ADMIN' }],
    };
    expect(() => assertCompanyAccess(decoded, 9)).toThrow(ForbiddenException);
  });

  it('throws when role on the company is not in the allow-list', () => {
    const decoded: DecodedJwtPayload = {
      companySpecificRoles: [{ companyId: 7, role: 'BASIC USER' }],
    };
    expect(() => assertCompanyAccess(decoded, 7)).toThrow(ForbiddenException);
  });

  it('allows STANDARD USER / ADMIN / PRIMARY ADMIN on the company', () => {
    for (const role of ['STANDARD USER', 'ADMIN', 'PRIMARY ADMIN']) {
      const decoded: DecodedJwtPayload = {
        companySpecificRoles: [{ companyId: 5, role }],
      };
      expect(() => assertCompanyAccess(decoded, 5)).not.toThrow();
    }
  });

  it('handles companyId being a string vs number coercion', () => {
    const decoded: DecodedJwtPayload = {
      companySpecificRoles: [
        { companyId: '5' as unknown as number, role: 'ADMIN' },
      ],
    };
    expect(() => assertCompanyAccess(decoded, 5)).not.toThrow();
  });
});
