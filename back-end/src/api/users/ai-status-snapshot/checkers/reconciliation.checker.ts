import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReconciliationReport } from 'src/entities/reconciliation-report.entity';
import { StatusIssue } from '../types';

const OVERDUE_DAYS = 35; // monthly reconciliation cycle + a few days slack

/**
 * Reconciliation checker — surfaces active monthly reports that are still
 * Unbalanced. Severity escalates to `critical` once the report's
 * `month_end_date` is older than OVERDUE_DAYS.
 *
 * Schema notes:
 *   ReconciliationReport.reconcile_status enum is 'Balanced' | 'Unbalanced'
 *   ReconciliationReport.report_status    enum is 'Active'  | 'Deleted'
 *   The period date column is `month_end_date` (no `report_date` column).
 */
@Injectable()
export class ReconciliationChecker {
  constructor(
    @InjectRepository(ReconciliationReport)
    private readonly reconRepo: Repository<ReconciliationReport>,
  ) {}

  async check(companyId: number): Promise<StatusIssue[]> {
    const rows = await this.reconRepo
      .createQueryBuilder('r')
      .where('r.company_id = :cid', { cid: companyId })
      .andWhere("r.report_status = 'Active'")
      .andWhere("r.reconcile_status = 'Unbalanced'")
      .orderBy('r.month_end_date', 'DESC')
      .limit(200)
      .getMany();

    const issues: StatusIssue[] = [];
    const now = Date.now();
    for (const r of rows) {
      const periodEnd = r.month_end_date ? new Date(r.month_end_date) : null;
      const ageDays = periodEnd
        ? Math.floor((now - periodEnd.getTime()) / 86400000)
        : null;
      const overdue = ageDays != null && ageDays >= OVERDUE_DAYS;
      issues.push({
        id: `reconciliation:report:${r.report_id}:${overdue ? 'overdue' : 'unbalanced'}`,
        category: 'reconciliation',
        severity: overdue ? 'critical' : 'warning',
        title: overdue
          ? `Reconciliation overdue (${ageDays}d)`
          : 'Bank reconciliation is unbalanced',
        description: `Report #${r.report_id} for month ending ${
          periodEnd?.toISOString().slice(0, 10) ?? 'n/a'
        } is still 'Unbalanced'.`,
        affectedRecordType: 'reconciliation_report',
        affectedRecordId: r.report_id,
        suggestedAction: overdue
          ? 'Open the reconciliation, resolve unmatched transactions, and balance it.'
          : 'Finish the reconciliation so it balances.',
        agentCanHelp: false,
        requiresApproval: true,
        detectedAt: r.updated_on?.toISOString?.() ?? new Date().toISOString(),
      });
    }
    return issues;
  }
}
