import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentClaims } from 'src/entities/banking.entity';
import { StatusIssue } from '../types';

/**
 * Surfaces claims with retention misconfiguration or overdue status.
 * Lightweight: single SELECT, classifies in-memory.
 */
@Injectable()
export class ClaimsChecker {
  constructor(
    @InjectRepository(PaymentClaims)
    private readonly claimRepo: Repository<PaymentClaims>,
  ) {}

  async check(companyId: number): Promise<StatusIssue[]> {
    // PaymentClaims has two status columns:
    //   - `status`       — internal lifecycle (Draft, Confirmed, Sent, Paid, Deleted …)
    //   - `list_status`  — the label shown on the Claims list page, computed by
    //                       checkDateConditionsAndFetchStatus(). Values include
    //                       Draft, Add payment, Overdue, Confirm payment,
    //                       Confirm receipt, Void, Completed, Reconcile.
    // The Completed / Reconcile / Void terminal states only exist on
    // `list_status`, so we MUST scope by it — otherwise every finished claim
    // with a past due_date gets flagged as overdue.
    const rows = await this.claimRepo
      .createQueryBuilder('c')
      .where('c.company_id = :cid', { cid: companyId })
      .andWhere(
        "c.list_status NOT IN ('Completed','Reconcile','Void')",
      )
      .andWhere(
        "c.status NOT IN ('Archived','Deleted','Paid','Confirmed - Matched','Closed')",
      )
      .orderBy('c.updated_on', 'DESC')
      .limit(500)
      .getMany();

    const issues: StatusIssue[] = [];
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    for (const c of rows) {
      // Retention misconfiguration
      if (c.cash_retention && (!c.retention_amount || Number(c.retention_amount) <= 0)) {
        issues.push({
          id: `claims:payment_claim:${c.payment_claim_id}:retention_missing`,
          category: 'claims',
          severity: 'critical',
          title: `Claim ${c.payment_claim_id} has cash retention but no retention amount`,
          description: `Claim #${c.payment_claim_id} (${c.claim_reference ?? 'no ref'}) has cash retention enabled but retention_amount is null/zero.`,
          affectedRecordType: 'payment_claim',
          affectedRecordId: c.payment_claim_id,
          projectId: c.project_id ?? null,
          suggestedAction: 'Open the claim and set the retention amount or disable cash retention.',
          agentCanHelp: false,
          requiresApproval: true,
          detectedAt: c.updated_on?.toISOString?.() ?? new Date().toISOString(),
        });
      }
      // Overdue — gated on list_status so we don't double-count Draft or
      // pre-payment states the user hasn't been asked to action yet.
      const due = c.due_date ? new Date(c.due_date) : null;
      const overdueLabelStates = new Set([
        'Overdue',
        'Confirm payment',
        'Confirm receipt',
        'Add payment',
      ]);
      if (
        due &&
        due < today &&
        c.list_status !== 'Draft' &&
        overdueLabelStates.has(c.list_status)
      ) {
        const days = Math.ceil(
          (today.getTime() - due.getTime()) / 86400000,
        );
        issues.push({
          id: `claims:payment_claim:${c.payment_claim_id}:overdue`,
          category: 'claims',
          severity: days >= 14 ? 'critical' : 'warning',
          title: `Claim ${c.payment_claim_id} overdue (${days}d, ${c.list_status})`,
          description: `Claim #${c.payment_claim_id} (${c.claim_reference ?? 'no ref'}) was due ${due.toISOString().slice(0, 10)} and is in list status '${c.list_status}'.`,
          affectedRecordType: 'payment_claim',
          affectedRecordId: c.payment_claim_id,
          projectId: c.project_id ?? null,
          suggestedAction: 'Open the claim and progress it (record payment, follow up, or update status).',
          agentCanHelp: false,
          requiresApproval: true,
          detectedAt: c.updated_on?.toISOString?.() ?? new Date().toISOString(),
        });
      }
    }
    return issues;
  }
}
