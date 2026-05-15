import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { StatusIssue } from '../types';

const INACTIVE_CONTRACT_STATUSES: ReadonlyArray<string> = [
  'Archived',
  'Deleted',
  'Completed',
];

/**
 * Surfaces active contracts missing key fields that block downstream flows
 * (claims, retentions, ABA, notices). Lightweight — uses single SELECT.
 */
@Injectable()
export class ContractsChecker {
  constructor(
    @InjectRepository(ContractDetails)
    private readonly contractRepo: Repository<ContractDetails>,
  ) {}

  async check(companyId: number): Promise<StatusIssue[]> {
    const rows = await this.contractRepo
      .createQueryBuilder('c')
      .where('c.company_id = :cid', { cid: companyId })
      .andWhere('c.contract_status NOT IN (:...inactive)', {
        inactive: INACTIVE_CONTRACT_STATUSES,
      })
      .limit(500)
      .getMany();
    const issues: StatusIssue[] = [];
    for (const c of rows) {
      const missing: string[] = [];
      if (!c.client_supplier_id) missing.push('counterparty');
      if (!c.initial_contract_sum) missing.push('contract value');
      if (!c.contract_start_date) missing.push('start date');
      if (!c.payment_terms) missing.push('payment terms');
      if (missing.length === 0) continue;
      issues.push({
        id: `contracts:contract:${c.contract_id}:missing_fields`,
        category: 'contracts',
        severity: 'warning',
        title: `Contract ${c.contract_id} is missing key details`,
        description: `Contract #${c.contract_id} is missing: ${missing.join(', ')}.`,
        affectedRecordType: 'contract',
        affectedRecordId: c.contract_id,
        projectId: c.project_id ?? null,
        suggestedAction: 'Open the contract and fill in the missing fields.',
        agentCanHelp: false,
        requiresApproval: true,
        detectedAt: c.updated_on?.toISOString?.() ?? new Date().toISOString(),
      });
    }
    return issues;
  }
}
