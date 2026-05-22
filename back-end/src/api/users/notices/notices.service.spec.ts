/**
 * Task #240 — focused regression coverage for the Task #238 closing-trigger
 * idempotency path inside `NoticesService.handleTriggerAccountNotices`.
 *
 * The bank-account close/transfer/rename surface ultimately depends on
 * `findExistingAccountNotice` (TA2) and `findExistingClosingPerBeneficiary`
 * (per Contracting Party) to make a double-submit a no-op. We exercise
 * those branches directly without spinning up the full ~30-dep
 * `NoticesService` graph by binding the real method on a bare instance
 * (`Object.create(...)`) and stubbing the small set of collaborators it
 * actually touches.
 */
import { NoticesService } from './notices.service';

type AnyMock = jest.Mock<any, any>;

function makeQB() {
  const qb: any = {
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    distinct: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  };
  return qb;
}

interface SvcBag {
  service: NoticesService;
  noticesRepo: any;
  bankAccountsRepo: any;
  contractDetailsRepo: any;
  userDetailsRepo: any;
  companyDetailsRepo: any;
  handleGenerateNotice: AnyMock;
  getSubscriptionType: AnyMock;
  fetchModeOfAnUser: AnyMock;
  getCompanyAutoSendSetting: AnyMock;
}

function buildSvc(bankAccount: any, existingNoticeByType: Record<string, any> = {}): SvcBag {
  // Bare instance — bypass the constructor so we don't need its ~30 deps.
  const service = Object.create(NoticesService.prototype) as NoticesService;

  const noticesRepo = {
    findOne: jest.fn(async ({ where }: any) => {
      const t = where?.notice_type;
      return existingNoticeByType[t] ?? null;
    }),
  };
  const bankAccountsRepo = {
    findOne: jest.fn().mockResolvedValue(bankAccount),
  };
  const contractDetailsRepo = {
    createQueryBuilder: jest.fn(() => makeQB()),
  };
  const userDetailsRepo = { findOne: jest.fn() };
  const companyDetailsRepo = { findOne: jest.fn() };

  // Assign every field touched by the method-under-test + its small
  // internal helpers. Anything not referenced can stay undefined.
  Object.assign(service as any, {
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    noticesRepo,
    bankAccountsRepo,
    contractDetails: contractDetailsRepo,
    userDetails: userDetailsRepo,
    companyDetails: companyDetailsRepo,
  });

  // Stubs for sibling instance methods triggered by the closing path.
  const fetchModeOfAnUser = jest.fn().mockResolvedValue('Normal');
  const getCompanyAutoSendSetting = jest.fn().mockResolvedValue(false);
  const getSubscriptionType = jest.fn().mockResolvedValue('Free');
  const handleGenerateNotice = jest.fn().mockResolvedValue({
    status: 'SUCCESS',
    data: { id: 'gen-uuid', notice_id: 9001 },
  });
  const resolvePaymentName = jest.fn().mockReturnValue('Payment');
  (service as any).fetchModeOfAnUser = fetchModeOfAnUser;
  (service as any).getCompanyAutoSendSetting = getCompanyAutoSendSetting;
  (service as any).getSubscriptionType = getSubscriptionType;
  (service as any).handleGenerateNotice = handleGenerateNotice;
  (service as any).resolvePaymentName = resolvePaymentName;
  (service as any).generateNoticeDocument = jest.fn().mockResolvedValue(undefined);
  (service as any).updateNoticeStatus = jest.fn().mockResolvedValue(undefined);
  (service as any).handleGenerateMailForANotice = jest.fn();
  (service as any).handleSentAdminMailQbccNotice = jest.fn();
  (service as any).handlesentNoticeMail = jest.fn();
  (service as any).handleUpdateNotice = jest.fn();

  return {
    service,
    noticesRepo,
    bankAccountsRepo,
    contractDetailsRepo,
    userDetailsRepo,
    companyDetailsRepo,
    handleGenerateNotice,
    getSubscriptionType,
    fetchModeOfAnUser,
    getCompanyAutoSendSetting,
  };
}

const PTA_FOR_CLOSING = {
  bank_account_id: 10000000123,
  company_id: 42,
  account_type: 'Project Trust Account',
  closing_mode: 'Closed',
  project_ids: '7',
  client_supplier_id: 99,
  clientSuppliersDetails: { client_supplier_name: 'Acme', client_email_id: 'a@b.com' },
};

describe('NoticesService.handleTriggerAccountNotices — Task #238 closing-trigger idempotency', () => {
  const decoded = { userId: 7, companyId: 42 };
  const closingPayload = {
    bank_account_id: PTA_FOR_CLOSING.bank_account_id,
    closing_trigger: true,
  } as any;

  it('skips generating a duplicate TA2 closing notice when one already exists', async () => {
    const bag = buildSvc(PTA_FOR_CLOSING, {
      'QBCC TA2 Account Closing Notice': {
        id: 'existing-uuid',
        notice_id: 4242,
        status: 'Not Sent',
      },
    });

    await bag.service.handleTriggerAccountNotices(decoded, closingPayload);

    expect(bag.noticesRepo.findOne).toHaveBeenCalled();
    const ta2Lookup = bag.noticesRepo.findOne.mock.calls.find(
      (c: any[]) => c[0]?.where?.notice_type === 'QBCC TA2 Account Closing Notice',
    );
    expect(ta2Lookup).toBeDefined();
    expect(bag.handleGenerateNotice).not.toHaveBeenCalled();
  });

  it('generates a TA2 closing notice when none exists yet', async () => {
    const bag = buildSvc(PTA_FOR_CLOSING, {});

    await bag.service.handleTriggerAccountNotices(decoded, closingPayload);

    expect(bag.handleGenerateNotice).toHaveBeenCalledTimes(1);
    const generated = bag.handleGenerateNotice.mock.calls[0][1];
    expect(generated.notice_type).toBe('QBCC TA2 Account Closing Notice');
    expect(generated.bank_account_id).toBe(PTA_FOR_CLOSING.bank_account_id);
  });

  it('uses the Delete-Unsent/Delete-Sent exclusion when looking up existing closing notices', async () => {
    const bag = buildSvc(PTA_FOR_CLOSING, {});

    await bag.service.handleTriggerAccountNotices(decoded, closingPayload);

    expect(bag.noticesRepo.findOne).toHaveBeenCalled();
    const firstLookup = bag.noticesRepo.findOne.mock.calls[0][0];
    // `Not(In([...]))` evaluates to a typeorm operator object; we just
    // assert the right notice_type + bank_account_id were scoped, and
    // that the call passes a status filter (idempotency exclusion set).
    expect(firstLookup.where.bank_account_id).toBe(PTA_FOR_CLOSING.bank_account_id);
    expect(firstLookup.where.status).toBeDefined();
  });
});
