import { Repository } from 'typeorm';
import { BankAccounts, PaymentClaims } from 'src/entities/banking.entity';

/**
 * Claim statuses that are already settled / not outstanding. Mirrors the list
 * used by the Check 7 ("Payments to yourself as trustee") compliance engine in
 * pta-functions.ts so the manual-withdrawal warning and the compliance flag stay
 * in lockstep. claim_amount is already net of payments made, so SUM over the
 * non-excluded statuses == total outstanding amount owed to beneficiaries.
 */
const SETTLED_CLAIM_STATUSES = [
  'No Match Required',
  'Paid - Matched',
  'Received - Matched',
  'Deleted',
  'Paid - Payment Unmatched - Retention Out Matched - Retention In Unmatched',
  'Paid - Payment Unmatched - Retention Out Matched - Retention In Matched',
  'Paid - Payment Unmatched - Retention Out Unmatched - Retention In Matched',
  'Paid - Payment Matched - Retention Out Unmatched - Retention In Matched',
  'Paid - Payment Matched - Retention Out Matched - Retention In Unmatched',
  'Paid - Payment Matched - Retention Out Unmatched - Retention In Unmatched',
  'Paid - Unmatched',
  'Received - Unmatched',
];

export interface TrusteeWithdrawalShortfallResult {
  // Only Project Trust Accounts are subject to the BIF s51/s20B trustee rule.
  applicable: boolean;
  hasShortfall: boolean;
  currentBalance: number;
  outstandingClaims: number;
  withdrawalAmount: number;
  balanceAfter: number;
  shortfallAmount: number;
}

/**
 * Computes whether withdrawing `withdrawalAmount` from a Project Trust Account
 * would leave its balance below the total of all outstanding claims across the
 * project(s) the account serves.
 *
 * Per BIF s51/s20B this is NOT a breach on its own — it is surfaced only as a
 * non-blocking warning (dismissible popup on manual add, advisory note on the
 * Xero trust-movement confirmation log). Returns `applicable: false` for any
 * non-Project-Trust account so callers can no-op safely.
 *
 * SCOPE — intentional difference from the Check 7 compliance engine:
 * pta-functions.ts runs PER PROJECT, so its shortfall flag sums claims for a
 * single project_id. A trustee withdrawal, by contrast, is drawn from the
 * ACCOUNT and has no single-project context, so this helper aggregates claims
 * across every project the account serves (via the same canonical
 * `bank_accounts.project_ids` link the compliance engine joins on). For a
 * single-project trust account the two are identical; for a multi-project trust
 * account this aggregate can only warn MORE than any per-project compliance
 * check, never less — the safe direction for a non-blocking nudge. Keep the
 * SETTLED_CLAIM_STATUSES list and `cash_retention_type='Claim'` filter in
 * lockstep with the engine.
 */
export async function computeTrusteeWithdrawalShortfall(
  deps: {
    bankAccountsRepo: Repository<BankAccounts>;
    paymentClaimsRepo: Repository<PaymentClaims>;
  },
  params: { bankAccountId: number; withdrawalAmount: number },
): Promise<TrusteeWithdrawalShortfallResult> {
  const { bankAccountsRepo, paymentClaimsRepo } = deps;
  const bankAccountId = Number(params.bankAccountId);
  const withdrawalAmount = Number(params.withdrawalAmount) || 0;

  const notApplicable: TrusteeWithdrawalShortfallResult = {
    applicable: false,
    hasShortfall: false,
    currentBalance: 0,
    outstandingClaims: 0,
    withdrawalAmount,
    balanceAfter: 0,
    shortfallAmount: 0,
  };

  if (!bankAccountId) return notApplicable;

  const account = await bankAccountsRepo.findOne({
    where: { bank_account_id: bankAccountId } as any,
  });
  if (!account || (account as any).account_type !== 'Project Trust Account') {
    return notApplicable;
  }

  const currentBalance = account.current_balance
    ? Number(account.current_balance)
    : 0;

  const projectIds = (account.project_ids || [])
    .map((p) => Number(p))
    .filter((n) => !Number.isNaN(n));

  let outstandingClaims = 0;
  if (projectIds.length) {
    const row = await paymentClaimsRepo
      .createQueryBuilder('pc')
      .select('COALESCE(SUM(pc.claim_amount), 0)', 'total')
      .where('pc.project_id IN (:...projectIds)', { projectIds })
      .andWhere(`pc.cash_retention_type = 'Claim'`)
      .andWhere('pc.status NOT IN (:...settled)', {
        settled: SETTLED_CLAIM_STATUSES,
      })
      .getRawOne();
    outstandingClaims = Number(row?.total) || 0;
  }

  const balanceAfter = currentBalance - withdrawalAmount;
  const shortfallAmount = Math.max(0, outstandingClaims - balanceAfter);

  return {
    applicable: true,
    hasShortfall: shortfallAmount > 0,
    currentBalance,
    outstandingClaims,
    withdrawalAmount,
    balanceAfter,
    shortfallAmount,
  };
}
