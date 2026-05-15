import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { PaymentClaims } from 'src/entities/banking.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { AiToolError } from '../ai-tool.interface';

export interface ClaimSummary {
  claimId: number;
  companyId: number;
  status: string;
  listStatus: string | null;
  claimType: string;
  cashRetentionType: string | null;
  reference: string | null;
  claimAmount: number | null;
  retentionAmount: number | null;
  retentionPercentage: number | null;
  paidAmount: number | null;
  outstandingAmount: number | null;
  dueDate: string | null;
  sentDate: string | null;
  receivedDate: string | null;
  contractId: number | null;
  contractName: string | null;
  projectId: number | null;
  projectName: string | null;
  counterpartyId: number | null;
  counterpartyName: string | null;
}

export interface ContractSummary {
  contractId: number;
  companyId: number;
  contractName: string;
  contractStatus: string | null;
  contractType: string | null;
  billingType: string | null;
  clientSupplierRole: string | null;
  retentionType: string | null;
  initialContractSum: number | null;
  paymentTerms: number | null;
  contractDate: string | null;
  startDate: string | null;
  defectLiabilityEndDate: string | null;
  projectId: number | null;
  projectName: string | null;
  counterpartyId: number | null;
  counterpartyName: string | null;
}

export interface ProjectSummary {
  projectId: number;
  companyId: number;
  projectName: string;
  projectStatus: string;
  projectRole: string | null;
  projectDate: string | null;
  description: string | null;
  siteAddress: string | null;
  retentionType: string | null;
  headContractSum: number | null;
  ptaEligibility: string;
  rtaEligibility: string;
  ptaCompliance: string;
  rtaCompliance: string;
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toIsoDate(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/**
 * Read-only domain service backing the page-context-aware AI tools
 * (`getClaimSummary`, `getContractSummary`, `getProjectSummary`).
 *
 * Every method re-validates the caller's membership in the owning
 * company via `company_user_roles` and reports unauthorised reads as
 * `not_found` so the existence of inaccessible records is not leaked.
 */
@Injectable()
export class RecordSummaryService {
  constructor(
    @InjectRepository(CompanyUserRoles)
    private readonly userRolesRepo: Repository<CompanyUserRoles>,
    @InjectRepository(PaymentClaims)
    private readonly claimsRepo: Repository<PaymentClaims>,
    @InjectRepository(PaymentDetails)
    private readonly paymentsRepo: Repository<PaymentDetails>,
    @InjectRepository(ContractDetails)
    private readonly contractsRepo: Repository<ContractDetails>,
    @InjectRepository(ProjectDetails)
    private readonly projectsRepo: Repository<ProjectDetails>,
    @InjectRepository(ClientSuppliersDetails)
    private readonly clientSuppliersRepo: Repository<ClientSuppliersDetails>,
  ) {}

  private async assertMember(userId: number, companyId: number): Promise<void> {
    const role = await this.userRolesRepo.findOne({
      where: { user_id: userId, company_id: companyId, status: 'Active' },
    });
    if (!role) {
      throw new AiToolError('Record not found.', 'not_found');
    }
  }

  async getClaimForUser(
    userId: number,
    claimId: number,
    expectedCompanyId: number | null,
  ): Promise<ClaimSummary> {
    const claim = await this.claimsRepo.findOne({
      where: { payment_claim_id: claimId },
    });
    if (!claim) {
      throw new AiToolError(`Claim ${claimId} not found.`, 'not_found');
    }
    if (
      expectedCompanyId != null &&
      Number(expectedCompanyId) !== Number(claim.company_id)
    ) {
      // Caller's active workspace is not this claim's owner; do not
      // disclose ownership — report not_found.
      throw new AiToolError(`Claim ${claimId} not found.`, 'not_found');
    }
    await this.assertMember(userId, claim.company_id);

    const [contract, project, counterparty, payments] = await Promise.all([
      claim.contract_id
        ? this.contractsRepo.findOne({
            where: {
              contract_id: claim.contract_id,
              company_id: claim.company_id,
            },
          })
        : Promise.resolve(null),
      claim.project_id
        ? this.projectsRepo.findOne({
            where: {
              project_id: claim.project_id,
              company_id: claim.company_id,
            },
          })
        : Promise.resolve(null),
      claim.client_supplier_id
        ? this.clientSuppliersRepo.findOne({
            where: {
              client_supplier_id: claim.client_supplier_id,
              company_id: claim.company_id,
            },
          })
        : Promise.resolve(null),
      this.paymentsRepo
        .createQueryBuilder('p')
        .where('p.payment_claim_id = :id', { id: claim.payment_claim_id })
        .andWhere("COALESCE(p.payment_status, '') NOT IN ('Voided', 'Cancelled')")
        .getMany()
        .catch(() => [] as PaymentDetails[]),
    ]);

    const claimAmount = toNum(claim.claim_amount);
    let paidAmount: number | null = null;
    if (Array.isArray(payments) && payments.length) {
      paidAmount = payments.reduce((acc, p: any) => {
        const amt = toNum(p?.payment_amount);
        return amt != null ? acc + amt : acc;
      }, 0);
    }
    const outstanding =
      claimAmount != null && paidAmount != null
        ? Math.round((claimAmount - paidAmount) * 100) / 100
        : null;

    return {
      claimId: Number(claim.payment_claim_id),
      companyId: Number(claim.company_id),
      status: claim.status,
      listStatus: claim.list_status ?? null,
      claimType: String(claim.claim_type),
      cashRetentionType: claim.cash_retention_type ?? null,
      reference: claim.claim_reference ?? null,
      claimAmount,
      retentionAmount: toNum(claim.retention_amount),
      retentionPercentage: toNum(claim.retention_percentage),
      paidAmount,
      outstandingAmount: outstanding,
      dueDate: toIsoDate(claim.due_date),
      sentDate: toIsoDate(claim.sent_date),
      receivedDate: toIsoDate(claim.received_date),
      contractId: claim.contract_id ?? null,
      contractName: contract?.contract_name ?? null,
      projectId: claim.project_id ?? null,
      projectName: project?.project_name ?? null,
      counterpartyId: claim.client_supplier_id ?? null,
      counterpartyName: counterparty?.client_supplier_name ?? null,
    };
  }

  async getContractForUser(
    userId: number,
    contractId: number,
    expectedCompanyId: number | null,
  ): Promise<ContractSummary> {
    const contract = await this.contractsRepo.findOne({
      where: { contract_id: contractId },
    });
    if (!contract) {
      throw new AiToolError(`Contract ${contractId} not found.`, 'not_found');
    }
    if (
      expectedCompanyId != null &&
      Number(expectedCompanyId) !== Number(contract.company_id)
    ) {
      throw new AiToolError(`Contract ${contractId} not found.`, 'not_found');
    }
    await this.assertMember(userId, contract.company_id);

    const [project, counterparty] = await Promise.all([
      contract.project_id
        ? this.projectsRepo.findOne({
            where: {
              project_id: contract.project_id,
              company_id: contract.company_id,
            },
          })
        : Promise.resolve(null),
      contract.client_supplier_id
        ? this.clientSuppliersRepo.findOne({
            where: {
              client_supplier_id: contract.client_supplier_id,
              company_id: contract.company_id,
            },
          })
        : Promise.resolve(null),
    ]);

    return {
      contractId: Number(contract.contract_id),
      companyId: Number(contract.company_id),
      contractName: contract.contract_name,
      contractStatus: contract.contract_status ?? null,
      contractType: contract.contract_type ?? null,
      billingType: contract.contract_billing_type ?? null,
      clientSupplierRole: contract.client_supplier_role ?? null,
      retentionType: contract.retention_type ?? null,
      initialContractSum: toNum(contract.initial_contract_sum),
      paymentTerms: contract.payment_terms ?? null,
      contractDate: toIsoDate(contract.contract_date),
      startDate: toIsoDate(contract.contract_start_date),
      defectLiabilityEndDate: toIsoDate(contract.defect_liability_end_date),
      projectId: contract.project_id ?? null,
      projectName: project?.project_name ?? null,
      counterpartyId: contract.client_supplier_id ?? null,
      counterpartyName: counterparty?.client_supplier_name ?? null,
    };
  }

  async getProjectForUser(
    userId: number,
    projectId: number,
    expectedCompanyId: number | null,
  ): Promise<ProjectSummary> {
    const project = await this.projectsRepo.findOne({
      where: { project_id: projectId },
    });
    if (!project) {
      throw new AiToolError(`Project ${projectId} not found.`, 'not_found');
    }
    if (
      expectedCompanyId != null &&
      Number(expectedCompanyId) !== Number(project.company_id)
    ) {
      throw new AiToolError(`Project ${projectId} not found.`, 'not_found');
    }
    await this.assertMember(userId, project.company_id);

    return {
      projectId: Number(project.project_id),
      companyId: Number(project.company_id),
      projectName: project.project_name,
      projectStatus: project.project_status,
      projectRole: project.project_role ?? null,
      projectDate: toIsoDate(project.project_date),
      description: project.project_description ?? null,
      siteAddress: project.site_address ?? null,
      retentionType: project.retention_type ?? null,
      headContractSum: toNum(project.head_contract_sum),
      ptaEligibility: project.pta_eligibility,
      rtaEligibility: project.rta_eligibility,
      ptaCompliance: project.pta_compliance,
      rtaCompliance: project.rta_compliance,
    };
  }
}
