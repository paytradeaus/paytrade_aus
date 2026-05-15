import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { AiToolError } from '../ai-tool.interface';

export interface BusinessProfileSummary {
  companyId: number;
  companyName: string;
  legalName: string | null;
  entityType: string;
  email: string;
  phone: string;
  address: string;
}

/**
 * Domain service backing `getBusinessProfileSummary`. Re-validates
 * membership; non-members get `not_found` (not `permission_denied`)
 * so the existence of the company is not leaked.
 */
@Injectable()
export class BusinessProfileService {
  constructor(
    @InjectRepository(CompanyDetails)
    private readonly companyRepo: Repository<CompanyDetails>,
    @InjectRepository(CompanyUserRoles)
    private readonly userRolesRepo: Repository<CompanyUserRoles>,
  ) {}

  async getSummaryForUser(
    userId: number,
    companyId: number,
  ): Promise<BusinessProfileSummary> {
    const role = await this.userRolesRepo.findOne({
      where: { user_id: userId, company_id: companyId },
    });
    if (!role) {
      throw new AiToolError(
        `Business profile ${companyId} not found for user`,
        'not_found',
      );
    }

    const company = await this.companyRepo.findOne({
      where: { company_id: companyId },
    });
    if (!company) {
      throw new AiToolError(
        `Business profile ${companyId} not found`,
        'not_found',
      );
    }

    return {
      companyId: company.company_id,
      companyName: company.company_name,
      legalName: company.legal_company_name ?? null,
      entityType: company.entity_type,
      email: company.company_email_id,
      phone: company.company_phone_no,
      address: company.company_address,
    };
  }
}
