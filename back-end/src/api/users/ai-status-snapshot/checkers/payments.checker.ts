import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubPayments } from 'src/entities/sub-payments.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { StatusIssue } from '../types';

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
        affectedRecordType: 'sub_payment',
        affectedRecordId: r.sub_payment_id,
        suggestedAction: 'Open the payment and confirm the matching leg(s).',
        agentCanHelp: false,
        requiresApproval: true,
        detectedAt: r.updated_on?.toISOString?.() ?? new Date().toISOString(),
      });
    }
    return issues;
  }
}
