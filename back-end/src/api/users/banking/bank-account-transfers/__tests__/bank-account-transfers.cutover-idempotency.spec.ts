/**
 * Task #248 — regression coverage for the cutover row-lock +
 * idempotency guard added to `_runCutover`.
 *
 * Goal:
 *   Two concurrent `confirmTrustAccountTransfer` calls on the same
 *   Pending transfer must fire exactly ONE notice batch (and one
 *   contract re-point, one status flip, etc.). The second caller
 *   should short-circuit with a benign no-op once the row-level lock
 *   releases and exposes the `CutoverApplied` status.
 *
 * Strategy:
 *   - Mock `EntityManager.transaction` to serialize concurrent callers
 *     via a FIFO mutex — this mirrors what `SELECT … FOR UPDATE` does
 *     at the database layer.
 *   - Track the transfer row's status in a shared variable so the
 *     in-transaction `findOne` call returns the live value (Pending
 *     for caller #1, CutoverApplied for caller #2 after #1 commits).
 *   - Assert `noticeService.handleTriggerAccountNotices` is called
 *     exactly once across both concurrent invocations.
 */
import { BankAccountTransfersService } from '../bank-account-transfers.service';

type AnyMock = jest.Mock<any, any>;

function makeRepoMock(overrides: Partial<Record<string, any>> = {}) {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    save: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
    ...overrides,
  };
}

function makeUpdateQB(
  execute: AnyMock = jest.fn().mockResolvedValue({ affected: 1 }),
) {
  const qb: any = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    whereInIds: jest.fn().mockReturnThis(),
    execute,
  };
  return qb;
}

const SOURCE_BA = {
  bank_account_id: 10000000001,
  company_id: 42,
  account_name: 'PTA Source',
  account_type: 'Project Trust Account',
  status: 'Open',
  financial_institution: 'NAB',
  bsb_number: 84004,
  account_number: '1111111',
  opening_date: new Date('2024-01-01T00:00:00Z'),
};

const DEST_BA = {
  ...SOURCE_BA,
  bank_account_id: 10000000002,
  account_name: 'PTA Dest',
  account_number: '2222222',
  bsb_number: 84005,
};

const PENDING_XFER: any = {
  transfer_id: 555,
  source_bank_account_id: SOURCE_BA.bank_account_id,
  destination_bank_account_id: DEST_BA.bank_account_id,
  transfer_payment_id: 9001,
  transfer_date: new Date('2026-05-22T00:00:00Z'),
  status: 'Pending',
  last_error: null,
};

const DECODED = { userId: 7, companyId: 42, logged_in_by: 'USER' };

function buildService() {
  // Shared mutable status tracking the transfer row across both
  // concurrent callers. Caller #1 updates it inside its transaction;
  // caller #2 reads the post-commit value once the mutex releases.
  const state = { status: 'Pending' as string };

  const transfersRepo: any = makeRepoMock({
    findOne: jest.fn(async () => ({ ...PENDING_XFER, status: state.status })),
    update: jest.fn(async (_filter: any, patch: any) => {
      if (patch?.status) state.status = patch.status;
      return { affected: 1 };
    }),
  });
  const bankAccountsRepo: any = makeRepoMock({
    findOne: jest.fn(async (args: any) => {
      const id = args?.where?.bank_account_id;
      if (id === SOURCE_BA.bank_account_id) return { ...SOURCE_BA };
      if (id === DEST_BA.bank_account_id) return { ...DEST_BA };
      return null;
    }),
  });
  const paymentsRepo: any = makeRepoMock();
  const contractsRepo: any = makeRepoMock();
  const claimsRepo: any = makeRepoMock();

  const noticeService: any = {
    handleTriggerAccountNotices: jest.fn().mockResolvedValue({
      status: 'SUCCESS',
      data: { mails_to_sent: [] },
    }),
  };

  // Per-transaction repos. Each transaction gets a fresh set so
  // concurrent invocations don't share QB instances.
  const buildTxnEm = () => {
    const txnXferRepo: any = {
      findOne: jest.fn(async (args: any) => {
        // Validate the lock option is passed — this is the row-level
        // lock the task requires.
        expect(args?.lock).toEqual({ mode: 'pessimistic_write' });
        return { ...PENDING_XFER, status: state.status };
      }),
      update: jest.fn(async (_filter: any, patch: any) => {
        if (patch?.status) state.status = patch.status;
        return { affected: 1 };
      }),
      createQueryBuilder: jest.fn(() => makeUpdateQB()),
    };
    const txnBankRepo: any = {
      findOne: bankAccountsRepo.findOne,
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => makeUpdateQB()),
    };
    const txnDefault: any = {
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => makeUpdateQB()),
    };
    return {
      getRepository: jest.fn((entity: any) => {
        const name = entity?.name ?? '';
        if (name === 'BankAccountTransfers') return txnXferRepo;
        if (name === 'BankAccounts') return txnBankRepo;
        return txnDefault;
      }),
    };
  };

  // FIFO mutex — simulates SELECT … FOR UPDATE serialization.
  let chain: Promise<void> = Promise.resolve();
  const entityManager: any = {
    transaction: jest.fn(async (cb: any) => {
      const prev = chain;
      let release!: () => void;
      chain = new Promise<void>((r) => {
        release = r;
      });
      await prev;
      try {
        return await cb(buildTxnEm());
      } finally {
        release();
      }
    }),
    query: jest.fn().mockResolvedValue([]),
  };

  const service = new BankAccountTransfersService(
    transfersRepo,
    bankAccountsRepo,
    paymentsRepo,
    contractsRepo,
    claimsRepo,
    entityManager,
    noticeService,
  );

  return {
    service,
    transfersRepo,
    bankAccountsRepo,
    noticeService,
    entityManager,
    state,
  };
}

describe('BankAccountTransfersService — Task #248 cutover row-lock + idempotency', () => {
  it('fires the closing notice batch exactly once when two confirm calls race', async () => {
    const bag = buildService();

    const [r1, r2] = await Promise.all([
      bag.service.confirmTrustAccountTransfer(DECODED, PENDING_XFER.transfer_id),
      bag.service.confirmTrustAccountTransfer(DECODED, PENDING_XFER.transfer_id),
    ]);

    // Exactly one notice batch across both concurrent confirms.
    expect(bag.noticeService.handleTriggerAccountNotices).toHaveBeenCalledTimes(1);

    // Both callers got a benign success result.
    expect([r1?.warning, r2?.warning]).not.toContain(true);

    // Exactly one terminal transition.
    expect(bag.state.status).toBe('CutoverApplied');

    // One of the two responses is the "already applied" no-op message.
    const messages = [r1?.successMessage, r2?.successMessage];
    const noopCount = messages.filter((m) =>
      /already applied/i.test(String(m ?? '')),
    ).length;
    expect(noopCount).toBe(1);
  });

  it('short-circuits a single confirm when the row is already in CutoverApplied', async () => {
    const bag = buildService();
    // Pre-flip the row so the outer guard in confirmTrustAccountTransfer
    // is bypassed via the admin retry path's relaxed entry — but here
    // we exercise the in-transaction guard directly by calling
    // retryTrustAccountTransferCutover with a Pending row, then a
    // second concurrent call where the row is already applied. The
    // simpler assertion is: the first call inside _runCutover sees
    // 'Pending', flips to CutoverApplied; a second direct call to
    // _runCutover (via private access) observes the post-flip status
    // and no-ops.
    await bag.service.confirmTrustAccountTransfer(
      DECODED,
      PENDING_XFER.transfer_id,
    );
    expect(bag.noticeService.handleTriggerAccountNotices).toHaveBeenCalledTimes(1);

    // The outer findOne now reports CutoverApplied; confirm rejects.
    const second = await bag.service.confirmTrustAccountTransfer(
      DECODED,
      PENDING_XFER.transfer_id,
    );
    expect(second?.warning).toBe(true);
    expect(String(second?.warningMessage ?? '')).toMatch(/CutoverApplied/);
    // Still only one notice batch.
    expect(bag.noticeService.handleTriggerAccountNotices).toHaveBeenCalledTimes(1);
  });
});
