import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';

export interface SystemStatusSnapshot {
  generatedAt: string;
  scope: { userId: number; companyId: number | null };
  company: { id: number; name: string; entityType: string } | null;
  membership: { role: string | null; isOwner: boolean };
}

/**
 * Domain service backing `getSystemStatusSnapshot`. Re-validates
 * `companyId` against `company_user_roles` so a hallucinated id
 * cannot leak data.
 */
@Injectable()
export class SystemStatusService {
  constructor(
    @InjectRepository(CompanyDetails)
    private readonly companyRepo: Repository<CompanyDetails>,
    @InjectRepository(UserDetails)
    private readonly userRepo: Repository<UserDetails>,
    @InjectRepository(CompanyUserRoles)
    private readonly userRolesRepo: Repository<CompanyUserRoles>,
  ) {}

  async getSnapshotForUser(
    userId: number,
    companyId: number | null,
  ): Promise<SystemStatusSnapshot> {
    let membershipRole: string | null = null;
    let resolvedCompanyId: number | null = null;
    let resolvedCompany: CompanyDetails | null = null;

    if (companyId != null) {
      const role = await this.userRolesRepo.findOne({
        where: { user_id: userId, company_id: companyId },
      });
      if (!role) {
        // Caller is not a member; do not disclose the company.
        resolvedCompanyId = null;
      } else {
        resolvedCompanyId = companyId;
        membershipRole = role.company_role ?? null;
      }
    }

    if (resolvedCompanyId != null) {
      resolvedCompany = await this.companyRepo.findOne({
        where: { company_id: resolvedCompanyId },
      });
    }

    return {
      generatedAt: new Date().toISOString(),
      scope: { userId, companyId: resolvedCompanyId },
      company: resolvedCompany
        ? {
            id: resolvedCompany.company_id,
            name: resolvedCompany.company_name,
            entityType: resolvedCompany.entity_type,
          }
        : null,
      membership: {
        role: membershipRole,
        isOwner: membershipRole === 'OWNER',
      },
    };
  }
}
