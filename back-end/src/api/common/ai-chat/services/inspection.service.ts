import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { PaymentClaims, BankAccounts } from 'src/entities/banking.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { RetentionDetails } from 'src/entities/retention-details.entity';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';
import { XeroSyncLogs } from 'src/entities/xero-sync-logs.entity';
import { VariationDetails } from 'src/entities/variation-details.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';

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

export interface ProjectIssueSummary {
  projectId: number;
  projectName: string;
  status: string;
  role: string | null;
  retentionType: string | null;
  ptaEligibility: string;
  rtaEligibility: string;
  ptaCompliance: string;
  rtaCompliance: string;
  issues: string[];
}

export interface RetentionGroupSummary {
  beneficiaryType: string | null;
  clientSupplierId: number | null;
  counterpartyName: string | null;
  retainedCount: number;
  totalRetainedAmount: number;
}

export interface RetentionsHeldResult {
  totalRetainedAmount: number;
  totalRetainedCount: number;
  groups: RetentionGroupSummary[];
}

export interface TrustAccountBalance {
  bankAccountId: number;
  accountName: string;
  accountType: string;
  status: string;
  currentBalance: number | null;
  lastFourDigits: string | null;
  bsb: number | null;
  projectIds: number[] | null;
}

export interface VariationIssueSummary {
  variationId: number;
  variationName: string;
  status: string;
  projectId: number | null;
  contractId: number | null;
  variationAmount: number;
  ageDays: number;
  issues: string[];
}

export interface OverdueNoticeSummary {
  noticeId: number;
  noticeType: string | null;
  status: string;
  projectId: number | null;
  contractId: number | null;
  clientSupplierId: number | null;
  noticeDate: string | null;
  ageDays: number;
  issues: string[];
}

export interface XeroSyncStatusSummary {
  connected: boolean;
  tenantName: string | null;
  status: string | null;
  needsReauth: boolean;
  needsReauthSince: string | null;
  lastInactiveEmailSentAt: string | null;
  recentSyncLogCount: number;
  recentSyncErrorCount: number;
  lastSyncAt: string | null;
  notes: string[];
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
    @InjectRepository(ProjectDetails)
    private readonly projectRepo: Repository<ProjectDetails>,
    @InjectRepository(CompanyUserRoles)
    private readonly userRolesRepo: Repository<CompanyUserRoles>,
    @InjectRepository(RetentionDetails)
    private readonly retentionRepo: Repository<RetentionDetails>,
    @InjectRepository(BankAccounts)
    private readonly bankAccountRepo: Repository<BankAccounts>,
    @InjectRepository(XeroIntegrationDetails)
    private readonly xeroIntegrationRepo: Repository<XeroIntegrationDetails>,
    @InjectRepository(XeroSyncLogs)
    private readonly xeroSyncLogRepo: Repository<XeroSyncLogs>,
    @InjectRepository(VariationDetails)
    private readonly variationRepo: Repository<VariationDetails>,
    @InjectRepository(NoticeDetails)
    private readonly noticeRepo: Repository<NoticeDetails>,
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

  async listProjectsWithIssues(
    userId: number,
    companyId: number,
    limit = 25,
  ): Promise<ProjectIssueSummary[]> {
    await this.assertMembership(userId, companyId);
    const rows = await this.projectRepo
      .createQueryBuilder('p')
      .where('p.company_id = :cid', { cid: companyId })
      .andWhere(
        "p.project_status NOT IN ('Archived','Deleted','Completed')",
      )
      .orderBy('p.updated_on', 'DESC')
      .limit(Math.min(Math.max(limit, 1), 100))
      .getMany();

    const out: ProjectIssueSummary[] = [];
    for (const p of rows) {
      const issues: string[] = [];
      if (p.pta_eligibility === 'Yes' && p.pta_compliance !== 'Ok') {
        issues.push('PTA compliance: action required.');
      }
      if (p.rta_eligibility === 'Yes' && p.rta_compliance !== 'Ok') {
        issues.push('RTA compliance: action required.');
      }
      if (!p.site_address || String(p.site_address).trim() === '') {
        issues.push('Site address is missing.');
      }
      if (!p.project_role) {
        issues.push('Project role is not set.');
      }
      const sum = Number(p.head_contract_sum ?? 0);
      if (!sum || sum <= 0) {
        issues.push('Head contract sum is missing or zero.');
      }
      if (!p.retention_type) {
        issues.push('Retention type is not set.');
      }
      if (issues.length === 0) continue;
      out.push({
        projectId: p.project_id,
        projectName: p.project_name,
        status: p.project_status,
        role: p.project_role ?? null,
        retentionType: p.retention_type ?? null,
        ptaEligibility: p.pta_eligibility,
        rtaEligibility: p.rta_eligibility,
        ptaCompliance: p.pta_compliance,
        rtaCompliance: p.rta_compliance,
        issues,
      });
    }
    return out;
  }

  async getRetentionsHeld(
    userId: number,
    companyId: number,
    limit = 10,
  ): Promise<RetentionsHeldResult> {
    await this.assertMembership(userId, companyId);
    const rows = await this.retentionRepo
      .createQueryBuilder('r')
      .where('r.company_id = :cid', { cid: companyId })
      .andWhere("r.retention_status = 'Retained'")
      .getMany();

    const grouped = new Map<string, RetentionGroupSummary>();
    let totalAmount = 0;
    for (const r of rows) {
      const amt = Number(r.retained_amount ?? 0) || 0;
      totalAmount += amt;
      const key = `${r.beneficiary_type ?? 'unknown'}|${r.client_supplier_id ?? 'null'}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.retainedCount += 1;
        existing.totalRetainedAmount =
          Math.round((existing.totalRetainedAmount + amt) * 100) / 100;
      } else {
        grouped.set(key, {
          beneficiaryType: r.beneficiary_type ?? null,
          clientSupplierId: r.client_supplier_id
            ? Number(r.client_supplier_id)
            : null,
          counterpartyName: null,
          retainedCount: 1,
          totalRetainedAmount: Math.round(amt * 100) / 100,
        });
      }
    }

    const groups = Array.from(grouped.values()).sort(
      (a, b) => b.totalRetainedAmount - a.totalRetainedAmount,
    );

    // Hydrate counterparty names for the top groups only.
    const top = groups.slice(0, Math.min(Math.max(limit, 1), 50));
    const ids = top
      .map((g) => g.clientSupplierId)
      .filter((v): v is number => v != null);
    if (ids.length > 0) {
      const contacts = await this.contactRepo
        .createQueryBuilder('c')
        .where('c.company_id = :cid', { cid: companyId })
        .andWhere('c.client_supplier_id IN (:...ids)', { ids })
        .getMany();
      const nameById = new Map<number, string>();
      for (const c of contacts) {
        nameById.set(
          Number(c.client_supplier_id),
          (c as any).business_name ?? c.client_supplier_name ?? '',
        );
      }
      for (const g of top) {
        if (g.clientSupplierId != null) {
          g.counterpartyName = nameById.get(g.clientSupplierId) ?? null;
        }
      }
    }

    return {
      totalRetainedAmount: Math.round(totalAmount * 100) / 100,
      totalRetainedCount: rows.length,
      groups: top,
    };
  }

  async getTrustAccountBalances(
    userId: number,
    companyId: number,
  ): Promise<TrustAccountBalance[]> {
    await this.assertMembership(userId, companyId);
    const rows = await this.bankAccountRepo
      .createQueryBuilder('b')
      .where('b.company_id = :cid', { cid: companyId })
      .andWhere(
        "b.account_type IN ('Project Trust Account','Retention Trust Account')",
      )
      .andWhere("b.status NOT IN ('Deleted','Archived')")
      .orderBy('b.account_type', 'ASC')
      .addOrderBy('b.account_name', 'ASC')
      .getMany();

    return rows.map((b) => {
      const numStr = b.account_number ? String(b.account_number) : '';
      const lastFour = numStr.length >= 4 ? numStr.slice(-4) : numStr || null;
      return {
        bankAccountId: Number(b.bank_account_id),
        accountName: b.account_name,
        accountType: b.account_type,
        status: b.status,
        currentBalance:
          b.current_balance != null ? Number(b.current_balance) : null,
        lastFourDigits: lastFour,
        bsb: b.bsb_number ?? null,
        projectIds:
          Array.isArray(b.project_ids) && b.project_ids.length
            ? b.project_ids.map((n) => Number(n))
            : null,
      };
    });
  }

  async getXeroSyncStatus(
    userId: number,
    companyId: number,
  ): Promise<XeroSyncStatusSummary> {
    await this.assertMembership(userId, companyId);
    const integration = await this.xeroIntegrationRepo
      .createQueryBuilder('x')
      .where('x.company_id = :cid', { cid: companyId })
      .orderBy('x.updated_on', 'DESC')
      .getOne();

    const notes: string[] = [];
    if (!integration) {
      return {
        connected: false,
        tenantName: null,
        status: null,
        needsReauth: false,
        needsReauthSince: null,
        lastInactiveEmailSentAt: null,
        recentSyncLogCount: 0,
        recentSyncErrorCount: 0,
        lastSyncAt: null,
        notes: ['No Xero integration is connected for this business.'],
      };
    }

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentLogs = await this.xeroSyncLogRepo
      .createQueryBuilder('l')
      .where('l.integration_id = :id', { id: integration.integration_id })
      .andWhere('l.created_on >= :since', { since })
      .getMany();
    const recentErrorCount = recentLogs.filter(
      (l) => l.error_message || l.error_code,
    ).length;
    const lastSyncAt =
      recentLogs.length > 0
        ? recentLogs
            .map((l) => l.created_on)
            .filter((d) => !!d)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
        : null;

    if (integration.needs_reauth) {
      notes.push(
        'Xero connection needs re-authentication; the user should reconnect from Xero Settings.',
      );
    } else if ((integration.status || '').toLowerCase() !== 'active') {
      notes.push(
        `Xero integration status is "${integration.status}" — sync may be paused.`,
      );
    }
    if (recentErrorCount > 0) {
      notes.push(
        `${recentErrorCount} sync log${
          recentErrorCount === 1 ? '' : 's'
        } in the last 7 days reported an error.`,
      );
    }

    return {
      connected: true,
      tenantName: integration.tenant_name ?? null,
      status: integration.status ?? null,
      needsReauth: !!integration.needs_reauth,
      needsReauthSince: integration.needs_reauth_since
        ? new Date(integration.needs_reauth_since).toISOString()
        : null,
      lastInactiveEmailSentAt: integration.last_inactive_email_sent_at
        ? new Date(integration.last_inactive_email_sent_at).toISOString()
        : null,
      recentSyncLogCount: recentLogs.length,
      recentSyncErrorCount: recentErrorCount,
      lastSyncAt: lastSyncAt
        ? new Date(lastSyncAt as any).toISOString()
        : null,
      notes,
    };
  }

  async listVariationsWithIssues(
    userId: number,
    companyId: number,
    limit = 25,
  ): Promise<VariationIssueSummary[]> {
    await this.assertMembership(userId, companyId);
    const rows = await this.variationRepo
      .createQueryBuilder('v')
      .where('v.company_id = :cid', { cid: companyId })
      .andWhere(
        "v.variation_status NOT IN ('Archived','Deleted','Agreed','Refused')",
      )
      .andWhere('v.is_archived = false')
      .orderBy('v.updated_on', 'DESC')
      .limit(Math.min(Math.max(limit, 1), 100))
      .getMany();

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const out: VariationIssueSummary[] = [];
    for (const v of rows) {
      const issues: string[] = [];
      const amount = Number(v.variation_amount ?? 0);
      const created = v.created_on ? new Date(v.created_on) : null;
      const ageDays = created
        ? Math.max(
            0,
            Math.floor((today.getTime() - created.getTime()) / 86400000),
          )
        : 0;
      const status = v.variation_status ?? 'Draft';
      if (status === 'Draft') {
        issues.push(
          `Pending — still in Draft${ageDays > 0 ? ` for ${ageDays} day${ageDays === 1 ? '' : 's'}` : ''}.`,
        );
      } else if (status === 'In Review') {
        issues.push(
          `Pending — awaiting decision (In Review${ageDays > 7 ? ` for ${ageDays} days` : ''}).`,
        );
      }
      if (!amount || amount === 0) {
        issues.push('Variation amount is missing or zero.');
      }
      if (!v.variation_name || String(v.variation_name).trim() === '') {
        issues.push('Variation name is missing.');
      }
      if (issues.length === 0) continue;
      out.push({
        variationId: v.variation_id,
        variationName: v.variation_name,
        status,
        projectId: v.project_id ?? null,
        contractId: v.contract_id ?? null,
        variationAmount: amount,
        ageDays,
        issues,
      });
    }
    return out;
  }

  async listOverdueNotices(
    userId: number,
    companyId: number,
    limit = 25,
    overdueAfterDays = 7,
  ): Promise<OverdueNoticeSummary[]> {
    await this.assertMembership(userId, companyId);
    const rows = await this.noticeRepo
      .createQueryBuilder('n')
      .where('n.company_id = :cid', { cid: companyId })
      .andWhere("n.status IN ('Draft','Not Sent','Sending')")
      .orderBy('n.notice_date', 'ASC')
      .limit(Math.min(Math.max(limit, 1), 100))
      .getMany();

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const threshold = Math.max(0, overdueAfterDays);
    const out: OverdueNoticeSummary[] = [];
    for (const n of rows) {
      const noticeDate = n.notice_date ? new Date(n.notice_date) : null;
      const ageDays = noticeDate
        ? Math.max(
            0,
            Math.floor((today.getTime() - noticeDate.getTime()) / 86400000),
          )
        : 0;
      const issues: string[] = [];
      if (n.status === 'Sending') {
        issues.push(
          `Stuck in Sending${ageDays > 0 ? ` for ${ageDays} day${ageDays === 1 ? '' : 's'}` : ''}.`,
        );
      } else if (noticeDate && ageDays > threshold) {
        issues.push(
          `Overdue — status "${n.status}" and dated ${ageDays} day${ageDays === 1 ? '' : 's'} ago.`,
        );
      } else {
        continue;
      }
      out.push({
        noticeId: Number(n.notice_id),
        noticeType: n.notice_type ?? null,
        status: n.status,
        projectId: n.project_id ?? null,
        contractId: n.contract_id ?? null,
        clientSupplierId: n.client_supplier_id ?? null,
        noticeDate: noticeDate ? noticeDate.toISOString().slice(0, 10) : null,
        ageDays,
        issues,
      });
    }
    return out;
  }
}
