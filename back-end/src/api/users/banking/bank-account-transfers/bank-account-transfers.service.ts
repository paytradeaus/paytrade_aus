import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { BankAccounts } from 'src/entities/banking.entity';
import { BankAccountTransfers } from 'src/entities/bank-account-transfers.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { PaymentClaims } from 'src/entities/banking.entity';
import { RetentionDetails } from 'src/entities/retention-details.entity';
import { JournalEntries } from 'src/entities/journal-entries.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { NoticesService } from '../../notices/notices.service';

/**
 * Task #244 follow-up — Gap 1: anchor process_id for the per-account
 * journal entries written during cutover. Out-of-band of the existing
 * payment-claims `JournalType.process_type` range so we don't collide
 * with seeded types. A dedicated `JournalType` row for `Inter Trust
 * Transfer` (with `process_description`, `dynamic_values`, etc) is the
 * proper long-term home; until that seeder lands, the entries
 * themselves are still balanced, queryable, and audit-able.
 */
const JOURNAL_PROCESS_ID_INTER_TRUST_TRANSFER = 99244;
import {
  BankAccountPreflight,
  CutoverDryRunSummary,
} from './bank-account-transfers.dto';
import {
  StartTrustAccountTransferInput,
} from './bank-account-transfers.input';

var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

/**
 * Task #244 — Trust Account Transfer wizard service.
 *
 * High-level lifecycle:
 *   startTrustAccountTransfer  -> validates compat, creates Pending
 *     BankAccountTransfers row + companion 'Inter Trust Transfer'
 *     PaymentDetails row (current_status='Pending - Awaiting Match').
 *     No money moves; no contract pointers move; no notices fire.
 *   confirmTrustAccountTransfer -> runs the atomic cutover transaction
 *     described in `_runCutover`. Any throw rolls back fully and lands
 *     the transfer in `Failed` with `last_error`.
 *   cancelTrustAccountTransfer -> only legal while Pending. Soft-marks
 *     the companion payment Deleted, flips the transfer to Cancelled.
 *   retryTrustAccountTransferCutover -> admin-only; can dry-run.
 *
 * The preflight read-model (`getBankAccountPreflight`) is also exposed
 * here since it's shared between the wizard preflight step and the
 * Close validator hardening (Task #244 step 6).
 */
@Injectable()
export class BankAccountTransfersService {
  private logger: PaytradeLogger;

  constructor(
    @InjectRepository(BankAccountTransfers)
    private transfersRepo: Repository<BankAccountTransfers>,
    @InjectRepository(BankAccounts)
    private bankAccountsRepo: Repository<BankAccounts>,
    @InjectRepository(PaymentDetails)
    private paymentsRepo: Repository<PaymentDetails>,
    @InjectRepository(ContractDetails)
    private contractsRepo: Repository<ContractDetails>,
    @InjectRepository(PaymentClaims)
    private claimsRepo: Repository<PaymentClaims>,
    private entityManager: EntityManager,
    private noticesService: NoticesService,
  ) {
    this.logger = new PaytradeLogger('BANK_ACCOUNT_TRANSFERS_SERVICE');
  }

  // ---------------------------------------------------------------------
  // Tenant-scoping helper. Mirrors the pattern in BankAccountsService —
  // ADMIN impersonation is permitted; otherwise the caller's company
  // must match the bank account's company.
  // ---------------------------------------------------------------------
  private assertTenant(decoded: any, account: BankAccounts) {
    const callerCompanyId = decoded?.companyId ?? null;
    const isAdmin = decoded?.logged_in_by === 'ADMIN';
    if (
      !isAdmin &&
      (!callerCompanyId ||
        Number(callerCompanyId) !== Number(account.company_id))
    ) {
      throw new BadRequestException(
        'You are not authorized to act on this bank account.',
      );
    }
  }

  // ---------------------------------------------------------------------
  // Preflight read-model — shared between the Transfer wizard
  // (preflight step) and the Close validator (Close button gating).
  // Aggregates current balance, in-flight payments, open claims, open
  // retention, unreconciled transactions, and linked projects. Pure
  // read, no writes.
  // ---------------------------------------------------------------------
  async getBankAccountPreflight(
    decoded: any,
    bank_account_id: number,
  ): Promise<BankAccountPreflight> {
    const account = await this.bankAccountsRepo.findOne({
      where: { bank_account_id },
    });
    if (!account) {
      throw new BadRequestException(`Bank account ${bank_account_id} not found.`);
    }
    this.assertTenant(decoded, account);

    // In-flight payments: any payment whose source/dest/retention
    // account is this bank account AND whose current_status is not in
    // {'Confirmed - Matched','Deleted','Reconciled'}. We use a
    // conservative whitelist of "settled" statuses — anything else is
    // surfaced to the user.
    const inFlightRaw = await this.paymentsRepo
      .createQueryBuilder('p')
      .where(
        `(p.payment_from_account = :bid OR p.payment_to_account = :bid OR p.retention_account = :bid)`,
        { bid: bank_account_id },
      )
      .andWhere(`p.current_status NOT IN (:...settled)`, {
        settled: [
          'Confirmed - Matched',
          'Reconciled',
          'Deleted',
          'Completed',
        ],
      })
      .andWhere(`(p.payment_type IS NULL OR p.payment_type <> :xfer)`, {
        xfer: 'Inter Trust Transfer',
      })
      .orderBy('p.payment_date', 'DESC')
      .limit(500)
      .getMany();

    const openClaimsRaw = await this.claimsRepo
      .createQueryBuilder('c')
      .leftJoin(ContractDetails, 'ct', 'ct.contract_id = c.contract_id')
      .where(
        `(ct.payment_from_account = :bid OR ct.payment_to_account = :bid OR ct.retention_from_account = :bid)`,
        { bid: bank_account_id },
      )
      .andWhere(`c.status NOT IN (:...closedStatuses)`, {
        closedStatuses: ['Completed', 'Deleted', 'Paid', 'Archived'],
      })
      .select(['c.payment_claim_id', 'c.claim_reference', 'c.claim_amount', 'c.status'])
      .limit(500)
      .getRawMany();

    // Open retention = retention_details rows whose parent payment is
    // on this RTA (account_type === 'Retention Trust Account') and
    // whose retention_status is 'Retained'.
    let openRetentionRaw: any[] = [];
    if (account.account_type === 'Retention Trust Account') {
      // Task #249 — enrich each stranded retention row with the
      // parent payment + contract/project/client context so the
      // detail-page panel can render Release / Move-to quick actions
      // and a meaningful row label without a second round-trip.
      openRetentionRaw = await this.entityManager.query(
        `SELECT rd.retention_id,
                rd.retained_amount,
                rd.retention_status,
                rd.client_supplier_id,
                rd.payment_id,
                pd.contract_id,
                pd.project_id,
                p.project_name,
                cs.client_supplier_name
         FROM retention_details rd
         JOIN payment_details pd ON pd.payment_id = rd.payment_id
         LEFT JOIN project_details p ON p.project_id = pd.project_id
         LEFT JOIN client_suppliers_details cs ON cs.client_supplier_id = rd.client_supplier_id
         WHERE pd.retention_account = $1 AND rd.retention_status = 'Retained'
         ORDER BY rd.retention_id ASC
         LIMIT 500`,
        [bank_account_id],
      );
    }

    // Unreconciled transactions = imported bank-statement lines for
    // this account that haven't been matched or excluded. Counted from
    // the Transactions table (status enum: 'To Review' | 'Unmatched' |
    // 'Matched' | 'Excluded'). Both 'Matched' and 'Excluded' are
    // considered cleared; anything else blocks Close.
    const [{ count: unreconciledRaw }] = await this.entityManager.query(
      `SELECT COUNT(*)::int AS count
       FROM transactions
       WHERE bank_account_id = $1
         AND status NOT IN ('Matched','Excluded')`,
      [bank_account_id],
    );
    const unreconciledCount = Number(unreconciledRaw ?? 0);

    // Linked projects: contracts that reference this account.
    const contractsRaw = await this.contractsRepo
      .createQueryBuilder('c')
      .leftJoin('c.projectDetails', 'p')
      .leftJoin('c.clientSuppliersDetails', 'cs')
      .where(
        `(c.payment_from_account = :bid OR c.payment_to_account = :bid OR c.retention_from_account = :bid)`,
        { bid: bank_account_id },
      )
      .andWhere(`c.contract_status <> 'Deleted'`)
      .select([
        'c.contract_id AS contract_id',
        'c.project_id AS project_id',
        'p.project_name AS project_name',
        'cs.client_supplier_name AS client_supplier_name',
      ])
      .getRawMany();

    const closeBlockers: string[] = [];
    const transferBlockers: string[] = [];
    const balance = Number(account.current_balance ?? 0);
    if (Math.abs(balance) > 0.005) {
      closeBlockers.push(
        `Current balance is ${balance.toFixed(2)} — must be 0.00 to close.`,
      );
    }
    if (inFlightRaw.length > 0) {
      closeBlockers.push(
        `${inFlightRaw.length} in-flight payment(s) remain — settle or delete before closing.`,
      );
    }
    if (openClaimsRaw.length > 0) {
      closeBlockers.push(
        `${openClaimsRaw.length} open payment claim(s) on this account.`,
      );
    }
    if (openRetentionRaw.length > 0) {
      closeBlockers.push(
        `${openRetentionRaw.length} open retention row(s) — release or migrate first.`,
      );
    }
    if (unreconciledCount > 0) {
      closeBlockers.push(
        `${unreconciledCount} unreconciled bank transaction(s) — match or exclude them before closing.`,
      );
    }
    if (account.status !== 'Open') {
      closeBlockers.push(`Account is in status '${account.status}', not 'Open'.`);
      transferBlockers.push(
        `Only 'Open' accounts can be transferred; current status: '${account.status}'.`,
      );
    }
    if (
      account.account_type !== 'Project Trust Account' &&
      account.account_type !== 'Retention Trust Account'
    ) {
      closeBlockers.push('Only PTA / RTA accounts can be closed via this flow.');
      transferBlockers.push('Only PTA / RTA accounts can be transferred.');
    }

    return {
      bank_account_id,
      account_name: account.account_name,
      account_type: account.account_type as any,
      status: account.status as any,
      current_balance: balance,
      open_claims_count: openClaimsRaw.length,
      in_flight_payments_count: inFlightRaw.length,
      open_retention_count: openRetentionRaw.length,
      unreconciled_transactions_count: unreconciledCount,
      open_claims: openClaimsRaw.map((c: any) => ({
        id: Number(c.c_payment_claim_id ?? c.payment_claim_id),
        reference: c.c_claim_reference ?? c.claim_reference,
        amount: Number(c.c_claim_amount ?? c.claim_amount ?? 0),
        status: c.c_status ?? c.status,
      })),
      in_flight_payments: inFlightRaw.map((p) => ({
        id: Number(p.payment_id),
        amount: Number(p.total_amount ?? 0),
        status: p.current_status,
      })),
      open_retention: openRetentionRaw.map((r: any) => ({
        id: Number(r.retention_id),
        amount: Number(r.retained_amount ?? 0),
        status: r.retention_status,
        payment_id:
          r.payment_id != null ? Number(r.payment_id) : undefined,
        contract_id:
          r.contract_id != null ? Number(r.contract_id) : undefined,
        project_id:
          r.project_id != null ? Number(r.project_id) : undefined,
        project_name: r.project_name ?? undefined,
        party_name: r.client_supplier_name ?? undefined,
        reference:
          r.project_name ??
          (r.contract_id != null ? `Contract #${r.contract_id}` : undefined),
      })),
      linked_projects: contractsRaw.map((c: any) => ({
        project_id: Number(c.project_id),
        project_name: c.project_name ?? null,
        contract_id: Number(c.contract_id),
        client_supplier_name: c.client_supplier_name ?? null,
      })),
      can_close: closeBlockers.length === 0,
      can_transfer: transferBlockers.length === 0,
      close_blockers: closeBlockers,
      transfer_blockers: transferBlockers,
    };
  }

  // ---------------------------------------------------------------------
  // Start a new transfer. Validates: same company, same type (PTA→PTA
  // or RTA→RTA), both Open, distinct accounts. Creates a Pending
  // BankAccountTransfers row + companion 'Inter Trust Transfer'
  // payment carrying the PT-XFER anti-echo reference.
  // ---------------------------------------------------------------------
  async startTrustAccountTransfer(
    decoded: any,
    input: StartTrustAccountTransferInput,
  ) {
    const {
      source_bank_account_id,
      destination_bank_account_id,
      transfer_date,
      amount,
      carry_across_choices,
    } = input;
    if (source_bank_account_id === destination_bank_account_id) {
      return {
        warning: true,
        warningMessage: 'Source and destination must be different accounts.',
      };
    }
    const [source, dest] = await Promise.all([
      this.bankAccountsRepo.findOne({ where: { bank_account_id: source_bank_account_id } }),
      this.bankAccountsRepo.findOne({ where: { bank_account_id: destination_bank_account_id } }),
    ]);
    if (!source) return { warning: true, warningMessage: 'Source account not found.' };
    if (!dest) return { warning: true, warningMessage: 'Destination account not found.' };
    this.assertTenant(decoded, source);
    if (source.company_id !== dest.company_id) {
      return { warning: true, warningMessage: 'Cross-tenant transfers are not allowed.' };
    }
    if (source.account_type !== dest.account_type) {
      return {
        warning: true,
        warningMessage:
          'PTA can only transfer to another PTA; RTA can only transfer to another RTA.',
      };
    }
    if (source.status !== 'Open' || dest.status !== 'Open') {
      return {
        warning: true,
        warningMessage: 'Both source and destination accounts must be Open.',
      };
    }
    // Reject if a Pending/Failed transfer already exists for this source.
    const existing = await this.transfersRepo.findOne({
      where: {
        source_bank_account_id,
        status: In(['Pending', 'Confirmed', 'Failed']) as any,
      },
    });
    if (existing) {
      return {
        warning: true,
        warningMessage: `An in-progress transfer already exists for this account (transfer #${existing.transfer_id}, status=${existing.status}). Confirm, cancel, or retry it before starting a new one.`,
      };
    }
    if (!(Number(amount) > 0)) {
      return { warning: true, warningMessage: 'Transfer amount must be > 0.' };
    }

    const transfer = await this.entityManager.transaction(async (mgr) => {
      const xferRepo = mgr.getRepository(BankAccountTransfers);
      const paymentRepo = mgr.getRepository(PaymentDetails);

      const row = xferRepo.create({
        company_id: source.company_id,
        source_bank_account_id,
        destination_bank_account_id,
        transfer_date,
        amount,
        status: 'Pending',
        carry_across_choices: carry_across_choices ?? {},
        created_by: decoded?.userId,
        updated_by: decoded?.userId,
      });
      const saved = await xferRepo.save(row);
      const bankTransferRef = `PT-XFER-${saved.transfer_id}`;

      // Companion two-leg payment. Single row models both legs: debit
      // source, credit destination — mirrors the existing 'Top Up' /
      // 'Withdrawal' two-account pattern. Stays Pending until cutover.
      const payment = paymentRepo.create({
        company_id: source.company_id,
        payment_type: 'Inter Trust Transfer',
        payment_from_account: source_bank_account_id,
        payment_to_account: destination_bank_account_id,
        total_amount: amount,
        payment_date: transfer_date,
        memo: `Trust account transfer from ${source.account_name} to ${dest.account_name}.`,
        current_status: 'Pending - Awaiting Match',
        trust_account_transfer_id: saved.transfer_id,
        bank_transfer_reference: bankTransferRef,
        created_by: decoded?.userId,
        updated_by: decoded?.userId,
      } as any);
      const savedPayment: any = await paymentRepo.save(payment as any);

      await xferRepo.update(
        { transfer_id: saved.transfer_id },
        {
          transfer_payment_id: savedPayment.payment_id,
          bank_transfer_reference: bankTransferRef,
        },
      );
      saved.transfer_payment_id = savedPayment.payment_id;
      saved.bank_transfer_reference = bankTransferRef;
      return saved;
    });

    this.logger.log(
      `[XFER_STARTED] transfer_id=${transfer.transfer_id} source=${source_bank_account_id} dest=${destination_bank_account_id} amount=${amount}`,
    );
    return {
      successMessage:
        'Transfer created. Nothing moves until the companion payment is confirmed, reconciled, or matched in Xero.',
      transfer: this._toDto(transfer, source, dest),
    };
  }

  // ---------------------------------------------------------------------
  // Cancel a Pending transfer. Soft-marks companion payment Deleted.
  // ---------------------------------------------------------------------
  async cancelTrustAccountTransfer(decoded: any, transfer_id: number) {
    const xfer = await this.transfersRepo.findOne({ where: { transfer_id } });
    if (!xfer) return { warning: true, warningMessage: 'Transfer not found.' };
    const source = await this.bankAccountsRepo.findOne({
      where: { bank_account_id: xfer.source_bank_account_id },
    });
    if (!source) return { warning: true, warningMessage: 'Source account not found.' };
    this.assertTenant(decoded, source);
    if (xfer.status !== 'Pending') {
      return {
        warning: true,
        warningMessage: `Only Pending transfers can be cancelled (current: ${xfer.status}).`,
      };
    }
    await this.entityManager.transaction(async (mgr) => {
      await mgr.getRepository(BankAccountTransfers).update(
        { transfer_id },
        {
          status: 'Cancelled',
          updated_by: decoded?.userId,
          updated_on: moment.tz('UTC').toDate(),
        },
      );
      if (xfer.transfer_payment_id) {
        await mgr.getRepository(PaymentDetails).update(
          { payment_id: xfer.transfer_payment_id },
          { current_status: 'Deleted', updated_by: decoded?.userId } as any,
        );
      }
    });
    this.logger.log(`[XFER_CANCELLED] transfer_id=${transfer_id} by user=${decoded?.userId}`);
    return { successMessage: 'Transfer cancelled.' };
  }

  // ---------------------------------------------------------------------
  // Confirm a Pending transfer → runs the atomic cutover.
  // ---------------------------------------------------------------------
  async confirmTrustAccountTransfer(decoded: any, transfer_id: number) {
    const xfer = await this.transfersRepo.findOne({ where: { transfer_id } });
    if (!xfer) return { warning: true, warningMessage: 'Transfer not found.' };
    const source = await this.bankAccountsRepo.findOne({
      where: { bank_account_id: xfer.source_bank_account_id },
    });
    if (!source) return { warning: true, warningMessage: 'Source account not found.' };
    this.assertTenant(decoded, source);
    if (xfer.status !== 'Pending' && xfer.status !== 'Failed') {
      return {
        warning: true,
        warningMessage: `Cannot confirm — transfer is in status '${xfer.status}'.`,
      };
    }
    return this._runCutover(decoded, transfer_id, false);
  }

  // ---------------------------------------------------------------------
  // Admin retry — allows re-firing the cutover on a Failed/Pending
  // transfer. dry_run defaults to true.
  // ---------------------------------------------------------------------
  async retryTrustAccountTransferCutover(
    decoded: any,
    transfer_id: number,
    dry_run = true,
  ) {
    const xfer = await this.transfersRepo.findOne({ where: { transfer_id } });
    if (!xfer) return { warning: true, warningMessage: 'Transfer not found.' };
    if (!['Pending', 'Failed'].includes(xfer.status)) {
      return {
        warning: true,
        warningMessage: `Cannot retry — transfer is in terminal state '${xfer.status}'.`,
      };
    }
    if (dry_run) {
      const summary = await this._computeDryRun(xfer);
      return {
        successMessage: 'Dry-run only. No changes applied.',
        dry_run_summary: summary,
      };
    }
    return this._runCutover(decoded, transfer_id, true);
  }

  // ---------------------------------------------------------------------
  // The atomic cutover transaction itself. Mirrors the spec in
  // task-244.md step 4. Any throw → full rollback + Failed/last_error.
  //
  // NOTE: balanced journal-entry writing is intentionally OUT of this
  // first cut — it's a substantial helper of its own (mirrors
  // payment-claims.service.ts:createJournalEntries) and is documented
  // as the immediate follow-up in `docs/architecture/<TODO>.md`.
  // The status flip + notice trigger + contract/pointer migration are
  // all in-transaction here so the cutover is still atomic.
  // ---------------------------------------------------------------------
  private async _runCutover(
    decoded: any,
    transfer_id: number,
    isAdminRetry: boolean,
  ) {
    let resultTransfer: BankAccountTransfers;
    let source: BankAccounts;
    let dest: BankAccounts;
    // Task #248 — set when a concurrent caller already applied the
    // cutover and we short-circuit with a no-op. Used to suppress the
    // post-commit success log + return a benign result.
    let alreadyApplied = false;
    // Task #244 follow-up — Gap 2 (architect fix). Hoisted out of the
    // txn callback so the per-contract TA3 notice loop can run AFTER
    // the cutover commits. Keeping that loop inside the transaction
    // held row locks far longer than necessary and increased
    // contention/retry pressure (notices fan out to template lookups,
    // document refs, etc.). Post-commit failure is acceptable: the
    // money side is already durable, the user can re-trigger notices
    // from the contract page if any individual contract failed.
    let repointedContractIds: number[] = [];
    try {
      await this.entityManager.transaction(async (mgr) => {
        const xferRepo = mgr.getRepository(BankAccountTransfers);
        // Task #248 — acquire a row-level lock on the transfer row
        // BEFORE doing any reads/writes. A second concurrent caller
        // (e.g. the user confirms while the Xero webhook matcher is
        // racing the same transfer) will block here until the first
        // transaction commits, then wake up and observe the
        // `CutoverApplied` status flipped below — at which point the
        // strict status-transition guard short-circuits.
        const xfer = await xferRepo.findOne({
          where: { transfer_id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!xfer) throw new Error('Transfer disappeared mid-transaction.');
        // Task #248 — idempotency guard. If the row is already in the
        // terminal `CutoverApplied` state, a concurrent caller beat us
        // to it. Return the row as-is without re-firing contract
        // re-points, notice batches, or journal writes.
        if (xfer.status === 'CutoverApplied') {
          alreadyApplied = true;
          resultTransfer = xfer;
          source = await mgr.getRepository(BankAccounts).findOne({
            where: { bank_account_id: xfer.source_bank_account_id },
          });
          dest = await mgr.getRepository(BankAccounts).findOne({
            where: { bank_account_id: xfer.destination_bank_account_id },
          });
          return;
        }
        if (!['Pending', 'Failed'].includes(xfer.status)) {
          throw new Error(
            `Cannot cutover — transfer status is '${xfer.status}'.`,
          );
        }
        source = await mgr.getRepository(BankAccounts).findOne({
          where: { bank_account_id: xfer.source_bank_account_id },
        });
        dest = await mgr.getRepository(BankAccounts).findOne({
          where: { bank_account_id: xfer.destination_bank_account_id },
        });
        if (!source || !dest) throw new Error('Source or destination missing.');
        if (dest.status !== 'Open') {
          throw new Error(
            `Destination is no longer Open (status=${dest.status}).`,
          );
        }

        // 1. Repoint contract pointers from source → destination.
        // Task #244 follow-up — Gap 2: capture contract IDs BEFORE the
        // update so we can fire per-contract TA3 notices on dest AFTER
        // the txn commits (see post-commit loop below). `repointedContractIds`
        // is declared in the outer scope.
        if (source.account_type === 'Project Trust Account') {
          const ptaContracts = await mgr
            .getRepository(ContractDetails)
            .createQueryBuilder('c')
            .select('c.contract_id', 'contract_id')
            .where(
              `(c.payment_from_account = :sid OR c.payment_to_account = :sid) AND c.contract_status <> 'Deleted'`,
              { sid: source.bank_account_id },
            )
            .getRawMany();
          repointedContractIds = ptaContracts.map((c: any) =>
            Number(c.contract_id),
          );
          await mgr
            .getRepository(ContractDetails)
            .createQueryBuilder()
            .update()
            .set({
              payment_from_account: dest.bank_account_id,
              updated_by: decoded?.userId,
            })
            .where(
              `payment_from_account = :sid AND contract_status <> 'Deleted'`,
              { sid: source.bank_account_id },
            )
            .execute();
          await mgr
            .getRepository(ContractDetails)
            .createQueryBuilder()
            .update()
            .set({
              payment_to_account: dest.bank_account_id,
              updated_by: decoded?.userId,
            })
            .where(
              `payment_to_account = :sid AND contract_status <> 'Deleted'`,
              { sid: source.bank_account_id },
            )
            .execute();
        } else if (source.account_type === 'Retention Trust Account') {
          const rtaContracts = await mgr
            .getRepository(ContractDetails)
            .createQueryBuilder('c')
            .select('c.contract_id', 'contract_id')
            .where(
              `c.retention_from_account = :sid AND c.contract_status <> 'Deleted'`,
              { sid: source.bank_account_id },
            )
            .getRawMany();
          repointedContractIds = rtaContracts.map((c: any) =>
            Number(c.contract_id),
          );
          await mgr
            .getRepository(ContractDetails)
            .createQueryBuilder()
            .update()
            .set({
              retention_from_account: dest.bank_account_id,
              updated_by: decoded?.userId,
            })
            .where(
              `retention_from_account = :sid AND contract_status <> 'Deleted'`,
              { sid: source.bank_account_id },
            )
            .execute();
        }

        // 2. Repoint in-flight payments still pointing at source.
        // 'In-flight' = not in a settled status. Excludes the
        // companion transfer payment itself.
        const settled = [
          'Confirmed - Matched',
          'Reconciled',
          'Deleted',
          'Completed',
        ];
        await mgr
          .getRepository(PaymentDetails)
          .createQueryBuilder()
          .update()
          .set({
            payment_from_account: dest.bank_account_id,
            updated_by: decoded?.userId,
          })
          .where(`payment_from_account = :sid`, {
            sid: source.bank_account_id,
          })
          .andWhere(`current_status NOT IN (:...settled)`, { settled })
          .andWhere(`payment_id <> :pid`, {
            pid: xfer.transfer_payment_id ?? 0,
          })
          .execute();
        await mgr
          .getRepository(PaymentDetails)
          .createQueryBuilder()
          .update()
          .set({
            payment_to_account: dest.bank_account_id,
            updated_by: decoded?.userId,
          })
          .where(`payment_to_account = :sid`, {
            sid: source.bank_account_id,
          })
          .andWhere(`current_status NOT IN (:...settled)`, { settled })
          .andWhere(`payment_id <> :pid`, {
            pid: xfer.transfer_payment_id ?? 0,
          })
          .execute();
        await mgr
          .getRepository(PaymentDetails)
          .createQueryBuilder()
          .update()
          .set({
            retention_account: dest.bank_account_id,
            updated_by: decoded?.userId,
          })
          .where(`retention_account = :sid`, {
            sid: source.bank_account_id,
          })
          .andWhere(`current_status NOT IN (:...settled)`, { settled })
          .execute();

        // 2b. Migrate `retention_details` rows for RTA→RTA transfers.
        //
        // Retention rows are anchored to a bank account indirectly, via
        // `payment_details.retention_account` on their parent payment.
        // Step 2 above only repoints retention_account for in-flight
        // (non-settled) payments, but a Retained retention typically
        // lives on a Confirmed-Matched (settled) parent payment — so
        // without this step, retained funds stay logically anchored to
        // the closed source account even though the cash has moved.
        //
        // Per-item choices live at
        //   carry_across_choices.open_retention[retention_id]
        //     -> 'carry' | 'release' | 'exclude'
        // Default (unspecified) is 'carry' — anything else leaves the
        // row tied to the source account, which is the same outcome
        // the user gets today for a release/exclude choice.
        //
        // Because `retention_account` is single-valued per payment,
        // if a payment has a mix of 'carry' and 'leave' choices we
        // cannot split it; we throw to roll the whole cutover back.
        if (source.account_type === 'Retention Trust Account') {
          const openRetentionChoices: Record<string, string> =
            (xfer.carry_across_choices as any)?.open_retention ?? {};
          const retainedRows: Array<{
            retention_id: string;
            payment_id: string;
          }> = await mgr.query(
            `SELECT rd.retention_id, rd.payment_id
             FROM retention_details rd
             JOIN payment_details pd ON pd.payment_id = rd.payment_id
             WHERE pd.retention_account = $1
               AND rd.retention_status = 'Retained'`,
            [source.bank_account_id],
          );

          const carryRetentionIds: string[] = [];
          const leaveRetentionIds = new Set<string>();
          for (const r of retainedRows) {
            const choice =
              openRetentionChoices[String(r.retention_id)] ?? 'carry';
            if (choice === 'carry') {
              carryRetentionIds.push(String(r.retention_id));
            } else {
              leaveRetentionIds.add(String(r.retention_id));
            }
          }

          if (carryRetentionIds.length > 0) {
            const paymentIdsToMove = new Set<string>();
            for (const r of retainedRows) {
              if (!leaveRetentionIds.has(String(r.retention_id))) {
                paymentIdsToMove.add(String(r.payment_id));
              }
            }
            for (const pid of paymentIdsToMove) {
              const onSame = retainedRows.filter(
                (r) => String(r.payment_id) === pid,
              );
              const hasLeave = onSame.some((r) =>
                leaveRetentionIds.has(String(r.retention_id)),
              );
              if (hasLeave) {
                throw new Error(
                  `Retention rows on payment ${pid} have conflicting carry-across choices; payment_details.retention_account is single-valued and cannot be split. Resolve the choices or release the leftover rows before retrying.`,
                );
              }
            }
            if (paymentIdsToMove.size > 0) {
              await mgr
                .getRepository(PaymentDetails)
                .createQueryBuilder()
                .update()
                .set({
                  retention_account: dest.bank_account_id,
                  updated_by: decoded?.userId,
                })
                .where(`payment_id IN (:...pids)`, {
                  pids: [...paymentIdsToMove],
                })
                .execute();
            }
            // Bump retention_details audit columns for the carried rows
            // so the move is visible in the row history.
            await mgr
              .getRepository(RetentionDetails)
              .createQueryBuilder()
              .update()
              .set({
                updated_by: decoded?.userId,
                updated_on: moment.tz('UTC').toDate(),
              })
              .where(`retention_id IN (:...rids)`, {
                rids: carryRetentionIds,
              })
              .execute();
          }
          this.logger.log(
            `[XFER_RETENTION_MIGRATED] transfer_id=${transfer_id} retained_total=${retainedRows.length} carried=${carryRetentionIds.length} left_behind=${leaveRetentionIds.size}`,
          );
        }

        // 3. Flip source status + persist destination snapshot into
        // closing_target_* so the existing TA2 closing notice
        // generators (notices.service.ts ~5829 / 6725) read the new
        // destination correctly. Also write closing_mode/effective
        // date/previous_account_name so the rename-aware branches in
        // the generator fire correctly.
        await mgr.getRepository(BankAccounts).update(
          { bank_account_id: source.bank_account_id },
          {
            status: 'Transferred',
            previous_status: source.status,
            closing_mode: 'Transferred',
            closing_effective_date: xfer.transfer_date,
            closing_previous_account_name: source.account_name,
            closing_target_account_name: dest.account_name,
            closing_target_financial_institution: dest.financial_institution,
            closing_target_bsb: dest.bsb_number,
            closing_target_account_number: dest.account_number,
            closing_target_opening_date: dest.opening_date,
            updated_by: decoded?.userId,
            updated_on: moment.tz('UTC').toDate(),
          } as any,
        );

        // 4. Companion payment → Confirmed - Matched.
        if (xfer.transfer_payment_id) {
          await mgr.getRepository(PaymentDetails).update(
            { payment_id: xfer.transfer_payment_id },
            {
              current_status: 'Confirmed - Matched',
              updated_by: decoded?.userId,
            } as any,
          );
        }

        // 4b. Task #244 follow-up — Gap 1: write balanced per-account
        // journal entries for the cash movement (source Credit, dest
        // Debit). In-transaction with everything else so a journal
        // failure rolls the whole cutover back.
        await this._writeTransferJournalEntries(mgr, {
          source,
          dest,
          amount: Number(xfer.amount ?? 0),
          transferId: xfer.transfer_id,
          paymentId: xfer.transfer_payment_id ?? null,
          transferDate: xfer.transfer_date,
          userId: decoded?.userId ?? null,
        });

        // 5. Fire closing notice batch (TA2 source + per-beneficiary).
        // Re-uses the closing_trigger path already wired in Task #238
        // — generators read the closing_* columns we just persisted.
        const notices = await this.noticesService.handleTriggerAccountNotices(
          decoded,
          {
            bank_account_id: source.bank_account_id,
            closing_trigger: true,
          } as any,
          mgr,
        );
        if (notices?.status === 'ERROR') {
          throw new Error(`Notice generation failed: ${notices.message}`);
        }

        // 5b. Per-contract TA3 destination notices, IN-TRANSACTION.
        // Task #244 spec is explicit that cutover is all-or-nothing —
        // notice/journal/migration failure must roll the whole thing
        // back. Therefore any failure in the per-contract TA3 fan-out
        // throws here and aborts the cutover (the outer catch lands
        // the transfer in Failed with `last_error`).
        // NOTE: the lock-contention concern raised in an earlier review
        // round (heavy template work holding row locks) is acknowledged
        // — the mitigation is to keep TA3 notice templates minimal /
        // async-defer their external sends, not to weaken cutover
        // atomicity.
        for (const cid of repointedContractIds) {
          const res =
            await this.noticesService.handleTriggerContractNotices(
              decoded,
              { contract_id: cid } as any,
              mgr,
            );
          if (res?.status === 'ERROR') {
            throw new Error(
              `TA3 destination notice failed for contract ${cid}: ${res?.message}`,
            );
          }
        }
        this.logger.log(
          `[XFER_TA3_DEST] transfer_id=${transfer_id} contracts_repointed=${repointedContractIds.length} status=ok`,
        );

        // 6. Persist transfer terminal state.
        await xferRepo.update(
          { transfer_id },
          {
            status: 'CutoverApplied',
            cutover_applied_at: moment.tz('UTC').toDate(),
            last_error: null,
            updated_by: decoded?.userId,
            updated_on: moment.tz('UTC').toDate(),
          },
        );

        resultTransfer = await xferRepo.findOne({ where: { transfer_id } });
      });
    } catch (err) {
      this.logger.error(
        `[XFER_CUTOVER_FAILED] transfer_id=${transfer_id} err=${err?.message}`,
      );
      // Outside-transaction: land the row in Failed so the user / admin
      // can retry. Do NOT swallow the original error — surface it.
      await this.transfersRepo.update(
        { transfer_id },
        {
          status: 'Failed',
          last_error: String(err?.message ?? err).slice(0, 2000),
          updated_by: decoded?.userId,
          updated_on: moment.tz('UTC').toDate(),
        },
      );
      throw err;
    }

    if (alreadyApplied) {
      // Task #248 — concurrent caller short-circuit. Log at info so
      // the race is observable but don't double-emit the success log.
      this.logger.log(
        `[XFER_CUTOVER_NOOP] transfer_id=${transfer_id} adminRetry=${isAdminRetry} reason=already_applied`,
      );
      return {
        successMessage: 'Transfer cutover was already applied by a concurrent request — no action taken.',
        transfer: this._toDto(resultTransfer, source, dest),
      };
    }

    // (TA3 destination notices ran in-transaction in step 5b above
    // per spec atomicity. No post-commit fan-out — if any contract's
    // notice failed, the whole cutover already rolled back and the
    // transfer row is in Failed for admin retry.)

    this.logger.log(
      `[XFER_CUTOVER_APPLIED] transfer_id=${transfer_id} adminRetry=${isAdminRetry}`,
    );
    return {
      successMessage: 'Transfer cutover applied. Source marked Transferred and closing notices generated.',
      transfer: this._toDto(resultTransfer, source, dest),
    };
  }

  /**
   * Task #244 follow-up — Gap 1. Writes balanced per-account journal
   * entries for the cash movement of an Inter Trust Transfer:
   *   source side  -> 1 row, entry_type='Credit', credit_amount=amount
   *   dest   side  -> 1 row, entry_type='Debit',  debit_amount=amount
   *
   * `journal_number` is the per-bank-account sequence anchored on
   * `bank_accounts.last_journal_id` (mirrors payment-claims.service
   * `createJournalEntries`). Each side independently increments its
   * own sequence; `last_journal_id` is bumped in the same transaction.
   *
   * `journal_process_id` is pinned to
   * `JOURNAL_PROCESS_ID_INTER_TRUST_TRANSFER` so future reporting can
   * filter on the transfer category once a `JournalType` seeder row
   * exists for it. The entries themselves are fully self-describing
   * via `journal_description` + `dynamic_values` and are not blocked
   * by the missing JournalType row.
   *
   * `audit_id` is the `transfer_id` so we can later locate / reverse
   * these entries by transfer.
   */
  private async _writeTransferJournalEntries(
    mgr: EntityManager,
    opts: {
      source: BankAccounts;
      dest: BankAccounts;
      amount: number;
      transferId: number;
      paymentId: number | null;
      transferDate: Date | string;
      userId: number | null;
    },
  ): Promise<void> {
    const { source, dest, amount, transferId, paymentId, transferDate, userId } =
      opts;
    if (!(Number(amount) > 0)) {
      throw new Error(
        `Transfer amount must be > 0 to write journal entries (got ${amount}).`,
      );
    }
    const txnDate =
      transferDate instanceof Date ? transferDate : new Date(transferDate);
    const description = `Inter Trust Transfer #${transferId} (${source.account_name} → ${dest.account_name})`;
    const dynamicValues = {
      transfer_id: transferId,
      source_bank_account_id: source.bank_account_id,
      destination_bank_account_id: dest.bank_account_id,
      transfer_payment_id: paymentId,
      amount,
    };

    // Pre-flight idempotency: an admin retry that's already written
    // entries for this transfer must not double-write or burn journal
    // numbers. Match on (audit_id, journal_process_id, is_reversed=false)
    // and short-circuit BEFORE allocating new journal numbers.
    const existing = await mgr.getRepository(JournalEntries).find({
      where: {
        audit_id: transferId as any,
        journal_process_id: JOURNAL_PROCESS_ID_INTER_TRUST_TRANSFER,
        is_reversed: false as any,
      },
    });
    if (existing.length > 0) {
      this.logger.log(
        `[XFER_JOURNAL_SKIP] transfer_id=${transferId} reason=already_written existing_count=${existing.length}`,
      );
      return;
    }

    // Architect feedback (code review): the previous version computed
    // `srcNextJournal = source.last_journal_id + 1` in-memory and wrote
    // it back as a fixed value, which races against concurrent journal
    // writers on the same account and can produce duplicate
    // `journal_number`s + lost increments. Replace with an atomic
    // `UPDATE ... SET last_journal_id = COALESCE(last_journal_id,0)+1
    // RETURNING last_journal_id` per side. PostgreSQL guarantees the
    // increment + read are atomic on the row; concurrent callers serialize
    // on the row lock the UPDATE takes and each observes a distinct value.
    const srcAlloc: Array<{ last_journal_id: number }> = await mgr.query(
      `UPDATE bank_accounts
         SET last_journal_id = COALESCE(last_journal_id, 0) + 1,
             updated_by = $2,
             updated_on = timezone('utc', now())
       WHERE bank_account_id = $1
       RETURNING last_journal_id`,
      [source.bank_account_id, userId],
    );
    const srcNextJournal = Number(srcAlloc?.[0]?.last_journal_id);
    if (!Number.isFinite(srcNextJournal) || srcNextJournal <= 0) {
      throw new Error(
        `Failed to allocate journal_number on source bank_account ${source.bank_account_id}.`,
      );
    }
    const destAlloc: Array<{ last_journal_id: number }> = await mgr.query(
      `UPDATE bank_accounts
         SET last_journal_id = COALESCE(last_journal_id, 0) + 1,
             updated_by = $2,
             updated_on = timezone('utc', now())
       WHERE bank_account_id = $1
       RETURNING last_journal_id`,
      [dest.bank_account_id, userId],
    );
    const destNextJournal = Number(destAlloc?.[0]?.last_journal_id);
    if (!Number.isFinite(destNextJournal) || destNextJournal <= 0) {
      throw new Error(
        `Failed to allocate journal_number on destination bank_account ${dest.bank_account_id}.`,
      );
    }

    const journalRepo = mgr.getRepository(JournalEntries);
    await journalRepo.save(
      journalRepo.create([
        {
          company_id: source.company_id,
          bank_account_id: source.bank_account_id,
          journal_number: srcNextJournal,
          audit_id: transferId,
          journal_suffix: 'a',
          activity_suffix: 'a',
          journal_date: txnDate,
          journal_description: description,
          dynamic_values: dynamicValues,
          transaction_account_id: dest.bank_account_id,
          debit_amount: 0,
          credit_amount: amount,
          balance_amount: amount,
          journal_process_id: JOURNAL_PROCESS_ID_INTER_TRUST_TRANSFER,
          entry_type: 'Credit',
          created_by: userId,
          created_group: 'SYSTEM',
        } as any,
        {
          company_id: dest.company_id,
          bank_account_id: dest.bank_account_id,
          journal_number: destNextJournal,
          audit_id: transferId,
          journal_suffix: 'a',
          activity_suffix: 'a',
          journal_date: txnDate,
          journal_description: description,
          dynamic_values: dynamicValues,
          transaction_account_id: source.bank_account_id,
          debit_amount: amount,
          credit_amount: 0,
          balance_amount: amount,
          journal_process_id: JOURNAL_PROCESS_ID_INTER_TRUST_TRANSFER,
          entry_type: 'Debit',
          created_by: userId,
          created_group: 'SYSTEM',
        } as any,
      ]),
    );

    // NOTE: the per-account `last_journal_id` columns were already
    // bumped atomically by the two `UPDATE ... RETURNING` calls above —
    // do NOT write them back here (a second SET would clobber any
    // concurrent allocation that landed between our allocate and our
    // insert).

    this.logger.log(
      `[XFER_JOURNAL_WRITTEN] transfer_id=${transferId} src_bank=${source.bank_account_id} src_jn=${srcNextJournal} dest_bank=${dest.bank_account_id} dest_jn=${destNextJournal} amount=${amount}`,
    );
  }

  private async _computeDryRun(
    xfer: BankAccountTransfers,
  ): Promise<CutoverDryRunSummary> {
    const source = await this.bankAccountsRepo.findOne({
      where: { bank_account_id: xfer.source_bank_account_id },
    });
    const notes: string[] = [];
    const contractWhere =
      source?.account_type === 'Project Trust Account'
        ? `(payment_from_account = $1 OR payment_to_account = $1) AND contract_status <> 'Deleted'`
        : `retention_from_account = $1 AND contract_status <> 'Deleted'`;
    const [{ count: contractCount }] = await this.entityManager.query(
      `SELECT COUNT(*)::int AS count FROM contract_details WHERE ${contractWhere}`,
      [xfer.source_bank_account_id],
    );
    const [{ count: paymentCount }] = await this.entityManager.query(
      `SELECT COUNT(*)::int AS count FROM payment_details
       WHERE (payment_from_account = $1 OR payment_to_account = $1 OR retention_account = $1)
         AND current_status NOT IN ('Confirmed - Matched','Reconciled','Deleted','Completed')
         AND payment_id <> $2`,
      [xfer.source_bank_account_id, xfer.transfer_payment_id ?? 0],
    );
    let retentionCarryCount = 0;
    let retentionLeaveCount = 0;
    if (source?.account_type === 'Retention Trust Account') {
      const retainedRows: Array<{
        retention_id: string;
        payment_id: string;
      }> = await this.entityManager.query(
        `SELECT rd.retention_id, rd.payment_id
         FROM retention_details rd
         JOIN payment_details pd ON pd.payment_id = rd.payment_id
         WHERE pd.retention_account = $1 AND rd.retention_status = 'Retained'`,
        [xfer.source_bank_account_id],
      );
      const openRetentionChoices: Record<string, string> =
        (xfer.carry_across_choices as any)?.open_retention ?? {};
      // Per-payment choice map so we can detect the
      // "mixed choices on a single payment" guard that
      // _runCutover throws on (retention_account is single-valued).
      const choicesByPayment = new Map<string, Set<string>>();
      for (const r of retainedRows) {
        const choice =
          openRetentionChoices[String(r.retention_id)] ?? 'carry';
        const effective = choice === 'carry' ? 'carry' : 'leave';
        if (effective === 'carry') {
          retentionCarryCount++;
        } else {
          retentionLeaveCount++;
        }
        const pid = String(r.payment_id);
        if (!choicesByPayment.has(pid)) choicesByPayment.set(pid, new Set());
        choicesByPayment.get(pid)!.add(effective);
      }
      const conflictPaymentIds: string[] = [];
      for (const [pid, set] of choicesByPayment) {
        if (set.size > 1) conflictPaymentIds.push(pid);
      }
      if (conflictPaymentIds.length > 0) {
        notes.push(
          `WARNING: ${conflictPaymentIds.length} payment(s) have mixed carry/leave choices on their retention rows ` +
            `(payment_id(s): ${conflictPaymentIds.join(', ')}). ` +
            `payment_details.retention_account is single-valued and cannot be split — the real cutover will throw and roll back. ` +
            `Resolve the choices or release the leftover rows before retrying.`,
        );
      }
    }
    notes.push(`Will flip source bank_accounts.status -> 'Transferred'.`);
    notes.push(`Will fire TA2 closing notice batch (source) + per-beneficiary closing notices.`);
    notes.push(`Will mark companion payment ${xfer.transfer_payment_id} as 'Confirmed - Matched'.`);
    return {
      contracts_to_repoint: contractCount,
      in_flight_payments_to_repoint: paymentCount,
      retention_rows_to_migrate: retentionCarryCount,
      retention_rows_to_leave: retentionLeaveCount,
      notes,
    };
  }

  // ---------------------------------------------------------------------
  // Task #249 — relocate stranded Retained retention_details rows
  // (left behind on a Transferred RTA because the user chose
  // 'leave' for them during the transfer) to a different Open RTA
  // in the same company. Moves the *parent* payment's
  // payment_details.retention_account in place; because that column
  // is single-valued per payment, all Retained rows on a given
  // payment must be relocated together.
  // ---------------------------------------------------------------------
  async relocateStrandedRetention(
    decoded: any,
    input: {
      source_bank_account_id: number;
      destination_bank_account_id: number;
      retention_ids: number[];
    },
  ) {
    const {
      source_bank_account_id,
      destination_bank_account_id,
      retention_ids,
    } = input;
    if (!retention_ids?.length) {
      return { warning: true, warningMessage: 'No retention rows selected.' };
    }
    if (source_bank_account_id === destination_bank_account_id) {
      return {
        warning: true,
        warningMessage:
          'Destination must differ from the source bank account.',
      };
    }
    const [source, dest] = await Promise.all([
      this.bankAccountsRepo.findOne({
        where: { bank_account_id: source_bank_account_id },
      }),
      this.bankAccountsRepo.findOne({
        where: { bank_account_id: destination_bank_account_id },
      }),
    ]);
    if (!source) {
      return { warning: true, warningMessage: 'Source account not found.' };
    }
    if (!dest) {
      return {
        warning: true,
        warningMessage: 'Destination account not found.',
      };
    }
    this.assertTenant(decoded, source);
    if (source.company_id !== dest.company_id) {
      return {
        warning: true,
        warningMessage: 'Cross-tenant retention moves are not allowed.',
      };
    }
    if (
      source.account_type !== 'Retention Trust Account' ||
      dest.account_type !== 'Retention Trust Account'
    ) {
      return {
        warning: true,
        warningMessage: 'Both source and destination must be Retention Trust Accounts.',
      };
    }
    if (dest.status !== 'Open') {
      return {
        warning: true,
        warningMessage: `Destination account is not Open (status=${dest.status}).`,
      };
    }

    // Load the actual stranded rows + their parent payments, scoped to
    // the source account. Anything not currently anchored to source +
    // Retained is rejected — prevents stale-UI accidents.
    const rows: Array<{
      retention_id: string;
      payment_id: string;
    }> = await this.entityManager.query(
      `SELECT rd.retention_id, rd.payment_id
       FROM retention_details rd
       JOIN payment_details pd ON pd.payment_id = rd.payment_id
       WHERE pd.retention_account = $1
         AND rd.retention_status = 'Retained'
         AND rd.retention_id = ANY($2::bigint[])`,
      [source_bank_account_id, retention_ids.map((n) => Number(n))],
    );
    if (rows.length === 0) {
      return {
        warning: true,
        warningMessage:
          'None of the selected retention rows are still tied to this account — refresh and try again.',
      };
    }
    const requestedIds = new Set(retention_ids.map((n) => String(n)));
    const foundIds = new Set(rows.map((r) => String(r.retention_id)));
    const missing = [...requestedIds].filter((id) => !foundIds.has(id));

    // For each parent payment, if there are sibling Retained rows on
    // the same payment that were NOT selected, we cannot split — the
    // retention_account column is single-valued. Reject with a clear
    // message so the user can re-select the missing siblings.
    const paymentIdsToMove = new Set<string>(rows.map((r) => String(r.payment_id)));
    const siblingRows: Array<{
      payment_id: string;
      retention_id: string;
    }> = await this.entityManager.query(
      `SELECT rd.payment_id, rd.retention_id
       FROM retention_details rd
       WHERE rd.payment_id = ANY($1::bigint[])
         AND rd.retention_status = 'Retained'`,
      [[...paymentIdsToMove]],
    );
    const conflictingPayments: string[] = [];
    for (const pid of paymentIdsToMove) {
      const onSame = siblingRows.filter(
        (s) => String(s.payment_id) === pid,
      );
      const hasLeftBehind = onSame.some(
        (s) => !foundIds.has(String(s.retention_id)),
      );
      if (hasLeftBehind) conflictingPayments.push(pid);
    }
    if (conflictingPayments.length > 0) {
      return {
        warning: true,
        warningMessage:
          `Cannot split retention on payment(s) ${conflictingPayments.join(', ')}. ` +
          `payment_details.retention_account is single-valued — select all Retained rows on each payment together, or release the rest first.`,
      };
    }

    await this.entityManager.transaction(async (mgr) => {
      await mgr
        .getRepository(PaymentDetails)
        .createQueryBuilder()
        .update()
        .set({
          retention_account: dest.bank_account_id,
          updated_by: decoded?.userId,
        })
        .where(`payment_id IN (:...pids)`, {
          pids: [...paymentIdsToMove],
        })
        .execute();
      await mgr
        .getRepository(RetentionDetails)
        .createQueryBuilder()
        .update()
        .set({
          updated_by: decoded?.userId,
          updated_on: moment.tz('UTC').toDate(),
        })
        .where(`retention_id IN (:...rids)`, {
          rids: rows.map((r) => String(r.retention_id)),
        })
        .execute();
    });

    this.logger.log(
      `[STRANDED_RETENTION_RELOCATED] source=${source_bank_account_id} dest=${destination_bank_account_id} rows=${rows.length} payments=${paymentIdsToMove.size} by user=${decoded?.userId}${missing.length ? ` missing=${missing.join(',')}` : ''}`,
    );
    return {
      successMessage:
        `Moved ${rows.length} retention row(s) across ${paymentIdsToMove.size} payment(s) to ${dest.account_name}.` +
        (missing.length
          ? ` (${missing.length} row(s) were skipped — already moved or released.)`
          : ''),
      relocated_count: rows.length,
      payments_repointed: paymentIdsToMove.size,
    };
  }

  async listOpenTransfersForAccount(
    decoded: any,
    bank_account_id?: number,
  ) {
    const callerCompanyId = decoded?.companyId;
    const where: any = {
      status: In(['Pending', 'Failed']) as any,
    };
    if (bank_account_id) where.source_bank_account_id = bank_account_id;
    if (callerCompanyId) where.company_id = Number(callerCompanyId);
    const rows = await this.transfersRepo.find({
      where,
      order: { created_on: 'DESC' },
      take: 50,
    });
    // Attach source/dest names — cheap inline join.
    const ids = new Set<number>();
    rows.forEach((r) => {
      ids.add(Number(r.source_bank_account_id));
      ids.add(Number(r.destination_bank_account_id));
    });
    const accounts = ids.size
      ? await this.bankAccountsRepo.find({
          where: { bank_account_id: In([...ids]) as any },
        })
      : [];
    const nameMap = new Map<number, string>();
    accounts.forEach((a) =>
      nameMap.set(Number(a.bank_account_id), a.account_name),
    );
    return {
      transfers: rows.map((r) => ({
        transfer_id: Number(r.transfer_id),
        source_bank_account_id: Number(r.source_bank_account_id),
        destination_bank_account_id: Number(r.destination_bank_account_id),
        source_account_name: nameMap.get(Number(r.source_bank_account_id)),
        destination_account_name: nameMap.get(Number(r.destination_bank_account_id)),
        transfer_date: r.transfer_date,
        amount: Number(r.amount),
        status: r.status,
        transfer_payment_id: r.transfer_payment_id
          ? Number(r.transfer_payment_id)
          : null,
        bank_transfer_reference: r.bank_transfer_reference,
        carry_across_choices: r.carry_across_choices,
        last_error: r.last_error,
        cutover_applied_at: r.cutover_applied_at,
        created_on: r.created_on,
      })),
    };
  }

  private _toDto(
    transfer: BankAccountTransfers,
    source?: BankAccounts,
    dest?: BankAccounts,
  ) {
    return {
      transfer_id: Number(transfer.transfer_id),
      source_bank_account_id: Number(transfer.source_bank_account_id),
      destination_bank_account_id: Number(transfer.destination_bank_account_id),
      source_account_name: source?.account_name,
      destination_account_name: dest?.account_name,
      transfer_date: transfer.transfer_date,
      amount: Number(transfer.amount),
      status: transfer.status,
      transfer_payment_id: transfer.transfer_payment_id
        ? Number(transfer.transfer_payment_id)
        : null,
      bank_transfer_reference: transfer.bank_transfer_reference,
      carry_across_choices: transfer.carry_across_choices,
      last_error: transfer.last_error,
      cutover_applied_at: transfer.cutover_applied_at,
      created_on: transfer.created_on,
    };
  }

  // ---------------------------------------------------------------------
  // Xero side-channel hook — used by the xero webhook matcher to
  // auto-confirm a Pending PT transfer when an inbound BankTransfer
  // arrives that we did not originate (i.e. the user moved the money
  // in Xero first). Also implements anti-echo: if the inbound
  // reference starts with 'PT-XFER-' we treat it as our own echo and
  // skip processing entirely.
  //
  // Returns:
  //   'ECHO'          — anti-echo of a PT-originated transfer, ignore.
  //   'AUTO_MATCHED'  — matched + cutover triggered on a Pending row.
  //   'NO_MATCH'      — no Pending transfer found; caller should surface
  //                     a 'detected unknown transfer' prompt to the user.
  // ---------------------------------------------------------------------
  async tryAutoMatchInboundBankTransfer(args: {
    reference?: string | null;
    source_bank_account_id?: number | null;
    destination_bank_account_id?: number | null;
    amount?: number | null;
    transfer_date?: Date | null;
    company_id: number;
  }): Promise<'ECHO' | 'AUTO_MATCHED' | 'NO_MATCH'> {
    const ref = (args.reference ?? '').toString();
    if (ref.startsWith('PT-XFER-')) {
      this.logger.log(`[XFER_XERO_MATCH] anti-echo skip ref=${ref}`);
      return 'ECHO';
    }
    if (!args.source_bank_account_id || !args.destination_bank_account_id) {
      return 'NO_MATCH';
    }
    // ±14 day window mirrors matchRetentionTransferCandidates.
    const within = (a?: Date | null, b?: Date | null) => {
      if (!a || !b) return true;
      const diff = Math.abs(
        new Date(a as any).getTime() - new Date(b as any).getTime(),
      );
      return diff <= 14 * 24 * 60 * 60 * 1000;
    };
    const candidates = await this.transfersRepo.find({
      where: {
        company_id: args.company_id,
        source_bank_account_id: args.source_bank_account_id as any,
        destination_bank_account_id: args.destination_bank_account_id as any,
        status: 'Pending' as any,
      },
    });
    const amt = Number(args.amount ?? 0);
    const match = candidates.find(
      (c) =>
        Math.abs(Number(c.amount) - amt) < 0.01 &&
        within(c.transfer_date as any, args.transfer_date as any),
    );
    if (!match) return 'NO_MATCH';

    this.logger.log(
      `[XFER_XERO_MATCH] auto-matched transfer_id=${match.transfer_id} ref=${ref}`,
    );
    // Mark with Xero's reference + run cutover under a system actor.
    await this.transfersRepo.update(
      { transfer_id: match.transfer_id },
      { bank_transfer_reference: ref || match.bank_transfer_reference },
    );
    await this._runCutover(
      { userId: null, logged_in_by: 'SYSTEM', companyId: args.company_id },
      Number(match.transfer_id),
      false,
    );
    return 'AUTO_MATCHED';
  }
}
