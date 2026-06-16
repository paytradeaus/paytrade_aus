import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubPayments } from 'src/entities/sub-payments.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { StatusIssue } from '../types';

/**
 * Payment types that are bank/trust money movements imported from Xero or the
 * trust-transfer wizard. They are auto-matched and have NO per-leg "confirm"
 * checkbox in the payment view, so a `is_*_confirmed = false` leg on one of
 * them can never be actioned by the user and must not surface as an awaiting-
 * confirmation issue. Claim payments (Full/Part/Pay Less…) and over/under-
 * payments keep their confirm flow and stay eligible.
 */
const NO_CONFIRM_PAYMENT_TYPES = [
  'Withdrawal',
  'Top Up',
  'Top Up Retention',
  'Inter Trust Transfer',
  'Interest Received',
  'Interest Withdrawal',
  'Bank Charge Applied',
  'Bank Charge Top Up',
];

/**
 * Surfaces unconfirmed sub-payments for the company. SubPayments has no
 * company_id column, so we scope by joining to PaymentDetails (which does).
 */
@Injectable()
export class PaymentsChecker {
  constructor(
    @InjectRepository(SubPayments)
    private readonly subPaymentRepo: Repository<SubPayments>,
    @InjectRepository(PaymentDetails)
    private readonly paymentRepo: Repository<PaymentDetails>,
  ) {}

  async check(companyId: number): Promise<StatusIssue[]> {
    const rows = await this.subPaymentRepo
      .createQueryBuilder('sp')
      .innerJoin(
        PaymentDetails,
        'pd',
        'pd.payment_id = sp.payment_id AND pd.company_id = :cid',
        { cid: companyId },
      )
      .where(
        '(sp.is_paid_confirmed = false OR sp.is_received_confirmed = false OR sp.is_retention_confirmed = false)',
      )
      .andWhere("sp.status IS DISTINCT FROM 'Matched'")
      // Exclude deleted/archived (voided) payments — the leg can no longer be
      // confirmed and the deep-link would open a void record.
      .andWhere("pd.current_status NOT IN ('Deleted', 'Archived')")
      // Exclude money-movement types that have no per-leg confirm checkbox.
      // (payment_type is nullable; keep NULL-type legs eligible.)
      .andWhere(
        '(pd.payment_type IS NULL OR pd.payment_type NOT IN (:...noConfirmTypes))',
        { noConfirmTypes: NO_CONFIRM_PAYMENT_TYPES },
      )
      .orderBy('sp.updated_on', 'DESC')
      .limit(200)
      .getMany();

    const issues: StatusIssue[] = [];
    for (const r of rows) {
      issues.push({
        id: `payments:sub_payment:${r.sub_payment_id}:unconfirmed`,
        category: 'payments',
        severity: r.status === 'Unmatched' ? 'warning' : 'info',
        title: 'Payment leg awaiting confirmation',
        description: `Sub-payment #${r.sub_payment_id} on payment #${r.payment_id} (${r.sub_payment_type ?? ''}) is unconfirmed (status: ${r.status}).`,
        // Point at the parent payment (not the sub-payment leg): the leg is
        // confirmed from inside the payment view, so the dashboard deep-links
        // to the payment using payment_id. The stable `id` above still carries
        // sub_payment_id so each leg remains a distinct row.
        affectedRecordType: 'payment',
        affectedRecordId: r.payment_id,
        suggestedAction: 'Open the payment and confirm the matching leg(s).',
        agentCanHelp: false,
        requiresApproval: true,
        detectedAt: r.updated_on?.toISOString?.() ?? new Date().toISOString(),
      });
    }
    return issues;
  }
}
