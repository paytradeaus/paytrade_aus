import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { PaymentClaims } from 'src/entities/banking.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';

export interface ClaimSummary {
  paymentClaimId: number;
  reference: string | null;
  status: string;
  contractId: number | null;
  projectId: number | null;
  cashRetention: boolean;
  retentionAmount: number;
  dueDate: string | null;
  issues: string[];
}

export interface ContactSummary {
  clientSupplierId: number;
  businessName: string | null;
  email: string | null;
  needsEmail: boolean;
  type: string | null;
}

const ALLOWED_ROLES = new Set([
  'PRIMARY ADMIN',
  'ADMIN',
  'STANDARD USER',
  'PORTAL ADMIN',
  'RESTRICTED PORTAL ADMIN',
]);

/**
 * Read-only inspection helpers used by the chat agent's tools.
 *
 * Every method re-validates membership against `company_user_roles`
 * before reading. The model can pass any `companyId`; only the JWT-
 * derived `userId` is trusted.
 */
@Injectable()
export class AiChatInspectionService {
  constructor(
    @InjectRepository(PaymentClaims)
    private readonly claimRepo: Repository<PaymentClaims>,
    @InjectRepository(ClientSuppliersDetails)
    private readonly contactRepo: Repository<ClientSuppliersDetails>,
    @InjectRepository(ContractDetails)
    private readonly contractRepo: Repository<ContractDetails>,
    @InjectRepository(CompanyUserRoles)
    private readonly userRolesRepo: Repository<CompanyUserRoles>,
  ) {}

  private async assertMembership(
    userId: number,
    companyId: number,
  ): Promise<void> {
    const role = await this.userRolesRepo.findOne({
      where: { user_id: userId, company_id: companyId },
    });
    if (!role) {
      throw new Error(
        `User ${userId} is not a member of company ${companyId}`,
      );
    }
    if (role.company_role && !ALLOWED_ROLES.has(role.company_role)) {
      throw new Error(
        `User ${userId} role on company ${companyId} does not permit reads`,
      );
    }
  }

  async listClaimsWithIssues(
    userId: number,
    companyId: number,
    limit = 25,
  ): Promise<ClaimSummary[]> {
    await this.assertMembership(userId, companyId);
    const rows = await this.claimRepo
      .createQueryBuilder('c')
      .where('c.company_id = :cid', { cid: companyId })
      .andWhere(
        "c.status NOT IN ('Archived','Deleted','Paid','Confirmed - Matched','Closed')",
      )
      .orderBy('c.updated_on', 'DESC')
      .limit(Math.min(Math.max(limit, 1), 100))
      .getMany();

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const out: ClaimSummary[] = [];
    for (const c of rows) {
      const issues: string[] = [];
      const retention = Number(c.retention_amount ?? 0);
      if (c.cash_retention && (!retention || retention <= 0)) {
        issues.push(
          'Cash retention is enabled but no retention amount is recorded.',
        );
      }
      const due = c.due_date ? new Date(c.due_date) : null;
      if (due && due < today && c.status !== 'Draft') {
        const days = Math.floor(
          (today.getTime() - due.getTime()) / 86400000,
        );
        issues.push(
          `Overdue by ${days} day${days === 1 ? '' : 's'} (status: ${c.status}).`,
        );
      }
      if (issues.length === 0) continue;
      out.push({
        paymentClaimId: c.payment_claim_id,
        reference: (c as any).claim_reference ?? null,
        status: c.status,
        contractId: (c as any).contract_id ?? null,
        projectId: c.project_id ?? null,
        cashRetention: !!c.cash_retention,
        retentionAmount: retention,
        dueDate: c.due_date ? String(c.due_date).slice(0, 10) : null,
        issues,
      });
    }
    return out;
  }

  async getClaimDetails(
    userId: number,
    companyId: number,
    paymentClaimId: number,
  ): Promise<ClaimSummary | null> {
    await this.assertMembership(userId, companyId);
    const c = await this.claimRepo
      .createQueryBuilder('c')
      .where('c.company_id = :cid AND c.payment_claim_id = :pid', {
        cid: companyId,
        pid: paymentClaimId,
      })
      .getOne();
    if (!c) return null;
    const issues: string[] = [];
    const retention = Number(c.retention_amount ?? 0);
    if (c.cash_retention && (!retention || retention <= 0)) {
      issues.push(
        'Cash retention is enabled but no retention amount is recorded.',
      );
    }
    const due = c.due_date ? new Date(c.due_date) : null;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (due && due < today && c.status !== 'Draft') {
      const days = Math.floor(
        (today.getTime() - due.getTime()) / 86400000,
      );
      issues.push(
        `Overdue by ${days} day${days === 1 ? '' : 's'} (status: ${c.status}).`,
      );
    }
    return {
      paymentClaimId: c.payment_claim_id,
      reference: (c as any).claim_reference ?? null,
      status: c.status,
      contractId: (c as any).contract_id ?? null,
      projectId: c.project_id ?? null,
      cashRetention: !!c.cash_retention,
      retentionAmount: retention,
      dueDate: c.due_date ? String(c.due_date).slice(0, 10) : null,
      issues,
    };
  }

  async listContactsMissingDetails(
    userId: number,
    companyId: number,
    limit = 25,
  ): Promise<ContactSummary[]> {
    await this.assertMembership(userId, companyId);
    const rows = await this.contactRepo
      .createQueryBuilder('c')
      .where('c.company_id = :cid', { cid: companyId })
      .andWhere('c.is_deleted = false')
      .andWhere(
        "(c.needs_email = true OR c.client_email_id IS NULL OR c.client_email_id = '')",
      )
      .orderBy('c.updated_on', 'DESC')
      .limit(Math.min(Math.max(limit, 1), 100))
      .getMany();

    return rows.map((r) => ({
      clientSupplierId: r.client_supplier_id,
      businessName: (r as any).business_name ?? r.client_supplier_name ?? null,
      email: r.client_email_id ?? null,
      needsEmail: !!(r as any).needs_email,
      type: (r as any).client_supplier_type ?? null,
    }));
  }
}
