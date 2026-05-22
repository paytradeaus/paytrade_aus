/**
 * Task #255 — regression coverage for relocateStrandedRetention.
 *
 * Invariants under test:
 *   - payment_details.retention_account is single-valued per payment,
 *     so all Retained rows on a parent payment must move together.
 *     Partial selection (a sibling left behind) must be rejected.
 *   - Tenant guard: a non-admin caller from a different company cannot
 *     relocate retention on someone else's source account.
 *   - Cross-company guard: source and destination must share company_id.
 *   - Destination must be a Retention Trust Account.
 *   - Destination must be 'Open'.
 *   - Stale UI: ids that are no longer Retained (or no longer anchored
 *     to the source) must be reported as a benign warning, not silently
 *     mutated.
 *
 * Mirrors the structural pattern of
 * `bank-account-transfers.cutover-idempotency.spec.ts`.
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

const SOURCE_RTA = {
  bank_account_id: 20000000001,
  company_id: 42,
  account_name: 'RTA Source',
  account_type: 'Retention Trust Account',
  status: 'Transferred',
  financial_institution: 'NAB',
  bsb_number: 84004,
  account_number: '3333333',
  opening_date: new Date('2024-01-01T00:00:00Z'),
};

const DEST_RTA_OPEN = {
  ...SOURCE_RTA,
  bank_account_id: 20000000002,
  account_name: 'RTA Dest',
  account_number: '4444444',
  status: 'Open',
};

const DEST_RTA_CLOSED = {
  ...DEST_RTA_OPEN,
  bank_account_id: 20000000003,
  status: 'Closed',
};

const DEST_PTA_OPEN = {
  ...DEST_RTA_OPEN,
  bank_account_id: 20000000004,
  account_type: 'Project Trust Account',
};

const DEST_OTHER_COMPANY = {
  ...DEST_RTA_OPEN,
  bank_account_id: 20000000005,
  company_id: 99,
};

const DECODED_USER = { userId: 7, companyId: 42, logged_in_by: 'USER' };
const DECODED_OTHER_TENANT = {
  userId: 8,
  companyId: 99,
  logged_in_by: 'USER',
};

type BuildOpts = {
  /** Rows returned by the "stranded rows" SELECT (filtered by source + Retained + ANY ids). */
  strandedRows: Array<{ retention_id: string; payment_id: string }>;
  /** Rows returned by the "sibling rows" SELECT (all Retained rows on the matched payments). */
  siblingRows: Array<{ payment_id: string; retention_id: string }>;
  /** Overrides for the bank-account lookups keyed by bank_account_id. */
  accounts: Record<number, any>;
};

function buildService(opts: BuildOpts) {
  const transfersRepo: any = makeRepoMock();
  const bankAccountsRepo: any = makeRepoMock({
    findOne: jest.fn(async (args: any) => {
      const id = Number(args?.where?.bank_account_id);
      return opts.accounts[id] ?? null;
    }),
  });
  const paymentsRepo: any = makeRepoMock();
  const contractsRepo: any = makeRepoMock();
  const claimsRepo: any = makeRepoMock();

  const noticeService: any = {
    handleTriggerAccountNotices: jest.fn(),
  };

  // Track the writes made inside the relocation transaction so tests
  // can assert on exactly what got mutated.
  const updates: Array<{ entity: string; values: any; whereSql: string; whereParams: any }> = [];

  const buildTxnEm = () => {
    const captureUpdateQB = (entityName: string) => {
      let pendingValues: any = null;
      let pendingWhere: { sql: string; params: any } | null = null;
      const exec: AnyMock = jest.fn(async () => {
        updates.push({
          entity: entityName,
          values: pendingValues,
          whereSql: pendingWhere?.sql ?? '',
          whereParams: pendingWhere?.params ?? null,
        });
        return { affected: 1 };
      });
      const qb: any = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn(function (v: any) {
          pendingValues = v;
          return qb;
        }),
        where: jest.fn(function (sql: string, params?: any) {
          pendingWhere = { sql, params };
          return qb;
        }),
        andWhere: jest.fn().mockReturnThis(),
        whereInIds: jest.fn().mockReturnThis(),
        execute: exec,
      };
      return qb;
    };
    const txnDefault: any = {
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => makeUpdateQB()),
    };
    return {
      getRepository: jest.fn((entity: any) => {
        const name = entity?.name ?? '';
        if (name === 'PaymentDetails' || name === 'RetentionDetails') {
          return {
            findOne: jest.fn(),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
            createQueryBuilder: jest.fn(() => captureUpdateQB(name)),
          };
        }
        return txnDefault;
      }),
    };
  };

  // The service issues 2 raw SELECTs before the transaction:
  //   #1 stranded rows (retention_id, payment_id) filtered by source + Retained + ANY(ids)
  //   #2 sibling rows (payment_id, retention_id) for those payments
  const queryMock: AnyMock = jest.fn(async (sql: string) => {
    if (/FROM retention_details rd\s+JOIN payment_details pd/i.test(sql)) {
      return opts.strandedRows;
    }
    if (/FROM retention_details rd\s+WHERE rd\.payment_id = ANY/i.test(sql)) {
      return opts.siblingRows;
    }
    return [];
  });

  const entityManager: any = {
    transaction: jest.fn(async (cb: any) => cb(buildTxnEm())),
    query: queryMock,
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

  return { service, entityManager, queryMock, updates, bankAccountsRepo };
}

describe('BankAccountTransfersService.relocateStrandedRetention — Task #255', () => {
  it('happy path: relocates every selected row when no siblings are left behind', async () => {
    const bag = buildService({
      accounts: {
        [SOURCE_RTA.bank_account_id]: { ...SOURCE_RTA },
        [DEST_RTA_OPEN.bank_account_id]: { ...DEST_RTA_OPEN },
      },
      strandedRows: [
        { retention_id: '101', payment_id: '9001' },
        { retention_id: '102', payment_id: '9001' },
        { retention_id: '201', payment_id: '9002' },
      ],
      // All Retained rows on the matched payments are in the request →
      // no split, allowed.
      siblingRows: [
        { payment_id: '9001', retention_id: '101' },
        { payment_id: '9001', retention_id: '102' },
        { payment_id: '9002', retention_id: '201' },
      ],
    });

    const res = await bag.service.relocateStrandedRetention(DECODED_USER, {
      source_bank_account_id: SOURCE_RTA.bank_account_id,
      destination_bank_account_id: DEST_RTA_OPEN.bank_account_id,
      retention_ids: [101, 102, 201],
    });

    expect(res?.warning).not.toBe(true);
    expect(res?.relocated_count).toBe(3);
    expect(res?.payments_repointed).toBe(2);

    // Two writes inside the transaction: payment_details (re-point
    // retention_account) and retention_details (audit fields).
    const pdUpdate = bag.updates.find((u) => u.entity === 'PaymentDetails');
    const rdUpdate = bag.updates.find((u) => u.entity === 'RetentionDetails');
    expect(pdUpdate).toBeDefined();
    expect(rdUpdate).toBeDefined();

    // payment_details.retention_account flips to the destination
    // bank_account_id for every parent payment in the move.
    expect(pdUpdate!.values).toMatchObject({
      retention_account: DEST_RTA_OPEN.bank_account_id,
      updated_by: DECODED_USER.userId,
    });
    expect(pdUpdate!.whereSql).toMatch(/payment_id IN/i);
    expect(new Set(pdUpdate!.whereParams.pids)).toEqual(
      new Set(['9001', '9002']),
    );

    expect(rdUpdate!.whereSql).toMatch(/retention_id IN/i);
    expect(new Set(rdUpdate!.whereParams.rids)).toEqual(
      new Set(['101', '102', '201']),
    );
  });

  it('rejects when a sibling Retained row on the same payment was NOT selected (no split allowed)', async () => {
    const bag = buildService({
      accounts: {
        [SOURCE_RTA.bank_account_id]: { ...SOURCE_RTA },
        [DEST_RTA_OPEN.bank_account_id]: { ...DEST_RTA_OPEN },
      },
      // User selected only one of the two Retained rows on payment 9001.
      strandedRows: [{ retention_id: '101', payment_id: '9001' }],
      siblingRows: [
        { payment_id: '9001', retention_id: '101' },
        { payment_id: '9001', retention_id: '102' }, // left behind
      ],
    });

    const res = await bag.service.relocateStrandedRetention(DECODED_USER, {
      source_bank_account_id: SOURCE_RTA.bank_account_id,
      destination_bank_account_id: DEST_RTA_OPEN.bank_account_id,
      retention_ids: [101],
    });

    expect(res?.warning).toBe(true);
    expect(String(res?.warningMessage)).toMatch(/Cannot split retention/i);
    expect(String(res?.warningMessage)).toContain('9001');
    // No writes — transaction must not have been entered.
    expect(bag.updates).toHaveLength(0);
    expect(bag.entityManager.transaction).not.toHaveBeenCalled();
  });

  it('rejects a cross-tenant caller (non-admin from a different company)', async () => {
    const bag = buildService({
      accounts: {
        [SOURCE_RTA.bank_account_id]: { ...SOURCE_RTA },
        [DEST_RTA_OPEN.bank_account_id]: { ...DEST_RTA_OPEN },
      },
      strandedRows: [{ retention_id: '101', payment_id: '9001' }],
      siblingRows: [{ payment_id: '9001', retention_id: '101' }],
    });

    await expect(
      bag.service.relocateStrandedRetention(DECODED_OTHER_TENANT, {
        source_bank_account_id: SOURCE_RTA.bank_account_id,
        destination_bank_account_id: DEST_RTA_OPEN.bank_account_id,
        retention_ids: [101],
      }),
    ).rejects.toThrow(/not authorized/i);

    expect(bag.updates).toHaveLength(0);
    expect(bag.entityManager.transaction).not.toHaveBeenCalled();
  });

  it('rejects when source and destination belong to different companies', async () => {
    const bag = buildService({
      accounts: {
        [SOURCE_RTA.bank_account_id]: { ...SOURCE_RTA },
        [DEST_OTHER_COMPANY.bank_account_id]: { ...DEST_OTHER_COMPANY },
      },
      strandedRows: [{ retention_id: '101', payment_id: '9001' }],
      siblingRows: [{ payment_id: '9001', retention_id: '101' }],
    });

    const res = await bag.service.relocateStrandedRetention(DECODED_USER, {
      source_bank_account_id: SOURCE_RTA.bank_account_id,
      destination_bank_account_id: DEST_OTHER_COMPANY.bank_account_id,
      retention_ids: [101],
    });

    expect(res?.warning).toBe(true);
    expect(String(res?.warningMessage)).toMatch(/cross-tenant/i);
    expect(bag.updates).toHaveLength(0);
  });

  it('rejects when destination is not a Retention Trust Account', async () => {
    const bag = buildService({
      accounts: {
        [SOURCE_RTA.bank_account_id]: { ...SOURCE_RTA },
        [DEST_PTA_OPEN.bank_account_id]: { ...DEST_PTA_OPEN },
      },
      strandedRows: [{ retention_id: '101', payment_id: '9001' }],
      siblingRows: [{ payment_id: '9001', retention_id: '101' }],
    });

    const res = await bag.service.relocateStrandedRetention(DECODED_USER, {
      source_bank_account_id: SOURCE_RTA.bank_account_id,
      destination_bank_account_id: DEST_PTA_OPEN.bank_account_id,
      retention_ids: [101],
    });

    expect(res?.warning).toBe(true);
    expect(String(res?.warningMessage)).toMatch(
      /Retention Trust Accounts/i,
    );
    expect(bag.updates).toHaveLength(0);
  });

  it('rejects when destination RTA is not Open', async () => {
    const bag = buildService({
      accounts: {
        [SOURCE_RTA.bank_account_id]: { ...SOURCE_RTA },
        [DEST_RTA_CLOSED.bank_account_id]: { ...DEST_RTA_CLOSED },
      },
      strandedRows: [{ retention_id: '101', payment_id: '9001' }],
      siblingRows: [{ payment_id: '9001', retention_id: '101' }],
    });

    const res = await bag.service.relocateStrandedRetention(DECODED_USER, {
      source_bank_account_id: SOURCE_RTA.bank_account_id,
      destination_bank_account_id: DEST_RTA_CLOSED.bank_account_id,
      retention_ids: [101],
    });

    expect(res?.warning).toBe(true);
    expect(String(res?.warningMessage)).toMatch(/not Open/i);
    expect(String(res?.warningMessage)).toContain('Closed');
    expect(bag.updates).toHaveLength(0);
  });

  it('rejects stale ids that no longer exist as Retained on the source (already released / moved)', async () => {
    const bag = buildService({
      accounts: {
        [SOURCE_RTA.bank_account_id]: { ...SOURCE_RTA },
        [DEST_RTA_OPEN.bank_account_id]: { ...DEST_RTA_OPEN },
      },
      // SELECT returns nothing — all requested ids have already been
      // released or moved elsewhere.
      strandedRows: [],
      siblingRows: [],
    });

    const res = await bag.service.relocateStrandedRetention(DECODED_USER, {
      source_bank_account_id: SOURCE_RTA.bank_account_id,
      destination_bank_account_id: DEST_RTA_OPEN.bank_account_id,
      retention_ids: [101, 102],
    });

    expect(res?.warning).toBe(true);
    expect(String(res?.warningMessage)).toMatch(/refresh and try again/i);
    expect(bag.updates).toHaveLength(0);
    expect(bag.entityManager.transaction).not.toHaveBeenCalled();
  });

  it('reports skipped ids when some are stale but the rest move successfully', async () => {
    const bag = buildService({
      accounts: {
        [SOURCE_RTA.bank_account_id]: { ...SOURCE_RTA },
        [DEST_RTA_OPEN.bank_account_id]: { ...DEST_RTA_OPEN },
      },
      // 101 still stranded; 999 already gone.
      strandedRows: [{ retention_id: '101', payment_id: '9001' }],
      siblingRows: [{ payment_id: '9001', retention_id: '101' }],
    });

    const res = await bag.service.relocateStrandedRetention(DECODED_USER, {
      source_bank_account_id: SOURCE_RTA.bank_account_id,
      destination_bank_account_id: DEST_RTA_OPEN.bank_account_id,
      retention_ids: [101, 999],
    });

    expect(res?.warning).not.toBe(true);
    expect(res?.relocated_count).toBe(1);
    expect(String(res?.successMessage)).toMatch(/1 row\(s\) were skipped/i);
  });
});
