/**
 * Task #240 — regression coverage for the Task #238 close/transfer/rename
 * trust-account notice trigger surface.
 *
 *   1. `closeOrChangeBankAccount` (Closed / Transferred)
 *        - persists closing context onto bank_accounts
 *        - flips status to Closed / Transferred
 *        - calls NoticesService.handleTriggerAccountNotices with
 *          `closing_trigger: true` inside the same transaction
 *        - rejects callers from another tenant (no notice fan-out)
 *        - rejects 'Renamed' mode (reserved for the internal path)
 *   2. `editDetailsOfABankAccount` rename-only auto-trigger inside
 *        - fires TA2 + Contracting Party Closing notices ONLY when a
 *          Sent S18B / TA1 already exists for the account
 *        - persists closing_mode='Renamed' + previous_account_name
 *
 * NoticesService is mocked — its own internal idempotency
 * (`findExistingAccountNotice` skip) is covered in
 * `back-end/src/api/users/notices/notices.service.spec.ts`.
 */
import { BankAccountsService } from './bank-accounts.service';

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

function makeUpdateQB(execute: AnyMock = jest.fn().mockResolvedValue({ affected: 1 })) {
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

interface ServiceBag {
  service: BankAccountsService;
  bankAccountsRepo: ReturnType<typeof makeRepoMock>;
  noticesRepo: ReturnType<typeof makeRepoMock>;
  noticeService: { handleTriggerAccountNotices: AnyMock; handleUpdateNotice: AnyMock };
  activityLogService: { insertActivityLog: AnyMock };
  paymentGatewayService: { getSubscriptionDetailsByCompanyId: AnyMock };
  bankAccountsValidator: { validateEditDetailsOfABankAccount: AnyMock };
  fileUploadService: { updateFileName: AnyMock };
  complianceService: { fetchComplianceResultsOfAProject: AnyMock };
  emailQueueProducer: { emailQueueProducer: AnyMock };
  entityManager: any;
  txnNoticeRepo: ReturnType<typeof makeRepoMock>;
  txnBankRepo: ReturnType<typeof makeRepoMock>;
  txnUpdateQB: ReturnType<typeof makeUpdateQB>;
}

function buildService(): ServiceBag {
  const bankAccountsRepo = makeRepoMock();
  const projectDetails = makeRepoMock();
  const clientSuppliersDetails = makeRepoMock();
  const paymentsRepo = makeRepoMock();
  const noticesRepo = makeRepoMock();
  const transactionsRepo = makeRepoMock();
  const reconciliationReportRepo = makeRepoMock();

  const bankAccountsValidator = {
    validateEditDetailsOfABankAccount: jest.fn(),
  } as any;
  const activityLogService = { insertActivityLog: jest.fn().mockResolvedValue(undefined) } as any;
  const fileUploadService = { updateFileName: jest.fn().mockResolvedValue(undefined) } as any;
  const complianceService = {
    fetchComplianceResultsOfAProject: jest.fn().mockResolvedValue(undefined),
  } as any;
  const noticeService = {
    handleTriggerAccountNotices: jest.fn().mockResolvedValue({
      status: 'SUCCESS',
      data: {
        mails_to_sent: [],
        update_notice_inputs: [],
        notice_previews: [],
        qbcc_notice_previews: [],
      },
    }),
    handleUpdateNotice: jest.fn().mockResolvedValue(undefined),
  } as any;
  const paymentGatewayService = {
    getSubscriptionDetailsByCompanyId: jest.fn().mockResolvedValue({
      is_free_plan_eligible: true,
      plan_items: [],
    }),
  } as any;
  const emailQueueProducer = { emailQueueProducer: jest.fn().mockResolvedValue(undefined) } as any;

  // The transactional EntityManager passed to the inner transaction
  // callback. Both `closeOrChangeBankAccount` and the rename branch use
  // `getRepository(...)` + a chained `createQueryBuilder().update()...`.
  const txnUpdateQB = makeUpdateQB();
  const txnBankRepo = makeRepoMock({
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  });
  const txnNoticeRepo = makeRepoMock({
    find: jest.fn().mockResolvedValue([]),
  });
  const txnEm: any = {
    getRepository: jest.fn((entity: any) => {
      const name = entity?.name ?? '';
      if (name === 'NoticeDetails') return txnNoticeRepo;
      if (name === 'BankAccounts') return txnBankRepo;
      return makeRepoMock();
    }),
    createQueryBuilder: jest.fn(() => txnUpdateQB),
  };
  const entityManager: any = {
    transaction: jest.fn(async (cb: any) => cb(txnEm)),
  };

  const service = new BankAccountsService(
    bankAccountsRepo as any,
    projectDetails as any,
    clientSuppliersDetails as any,
    paymentsRepo as any,
    noticesRepo as any,
    transactionsRepo as any,
    reconciliationReportRepo as any,
    bankAccountsValidator,
    activityLogService,
    fileUploadService,
    complianceService,
    noticeService,
    paymentGatewayService,
    entityManager,
    emailQueueProducer,
  );

  // Stub the post-transaction compliance fan-out so editDetails tests
  // don't try to walk real entities; the trigger logic we care about
  // executes inside the transaction.
  (service as any).fetchBankAccountDetailsforCompliance = jest
    .fn()
    .mockResolvedValue([]);

  return {
    service,
    bankAccountsRepo,
    noticesRepo,
    noticeService,
    activityLogService,
    paymentGatewayService,
    bankAccountsValidator,
    fileUploadService,
    complianceService,
    emailQueueProducer,
    entityManager,
    txnNoticeRepo,
    txnBankRepo,
    txnUpdateQB,
  };
}

const OPEN_PTA = {
  bank_account_id: 10000000123,
  id: 1,
  company_id: 42,
  account_name: 'PTA #1',
  account_type: 'Project Trust Account',
  status: 'Open',
  project_ids: '7',
  client_supplier_id: 99,
  account_number: '1234567',
  bsb_number: '084004',
  financial_institution: 'NAB',
};

const OPEN_RTA = {
  ...OPEN_PTA,
  bank_account_id: 10000000456,
  account_name: 'RTA #1',
  account_type: 'Retention Trust Account',
};

const DECODED_OWNER = { userId: 7, companyId: 42, logged_in_by: 'USER' };
const DECODED_OTHER_TENANT = { userId: 7, companyId: 999, logged_in_by: 'USER' };
const DECODED_ADMIN = { userId: 7, admin_id: 3, companyId: 999, logged_in_by: 'ADMIN' };

describe('BankAccountsService — Task #238 close/transfer/rename notice trigger', () => {
  describe('closeOrChangeBankAccount — Closed mode', () => {
    it('persists closing context, flips status, and fires closing-trigger notice fan-out', async () => {
      const bag = buildService();
      bag.bankAccountsRepo.findOne.mockResolvedValue({ ...OPEN_PTA });

      const result = await bag.service.closeOrChangeBankAccount(DECODED_OWNER, {
        bank_account_id: OPEN_PTA.bank_account_id,
        closing_mode: 'Closed',
        closing_effective_date: new Date('2026-05-01T00:00:00Z'),
        mark_notices_as_sent: false,
      } as any);

      expect(bag.entityManager.transaction).toHaveBeenCalledTimes(1);
      expect(bag.txnBankRepo.update).toHaveBeenCalledTimes(1);
      const [filter, patch] = bag.txnBankRepo.update.mock.calls[0];
      expect(filter).toEqual({ bank_account_id: OPEN_PTA.bank_account_id });
      expect(patch.status).toBe('Closed');
      expect(patch.closing_mode).toBe('Closed');
      expect(patch.closing_previous_account_name).toBe(OPEN_PTA.account_name);
      // Transferred-only fields must be null in Closed mode
      expect(patch.closing_target_account_name).toBeNull();
      expect(patch.closing_target_financial_institution).toBeNull();
      expect(patch.closing_target_bsb).toBeNull();
      expect(patch.closing_target_account_number).toBeNull();
      expect(patch.closing_target_opening_date).toBeNull();

      expect(bag.noticeService.handleTriggerAccountNotices).toHaveBeenCalledTimes(1);
      const [, triggerPayload, manager] = bag.noticeService.handleTriggerAccountNotices.mock.calls[0];
      expect(triggerPayload).toEqual({
        bank_account_id: OPEN_PTA.bank_account_id,
        mark_notices_as_sent: false,
        closing_trigger: true,
      });
      // The trigger must run inside the same transaction
      expect(manager).toBeDefined();
      expect(manager.getRepository).toBeDefined();

      expect(bag.activityLogService.insertActivityLog).toHaveBeenCalledTimes(1);
      expect(bag.activityLogService.insertActivityLog.mock.calls[0][0].event_template_id).toBe(70);
      expect(result.successMessage).toMatch(/closed/i);
    });

    it('rolls back the transaction when closing-notice generation fails', async () => {
      const bag = buildService();
      bag.bankAccountsRepo.findOne.mockResolvedValue({ ...OPEN_PTA });
      bag.noticeService.handleTriggerAccountNotices.mockResolvedValueOnce({
        status: 'ERROR',
        message: 'boom',
      });

      await expect(
        bag.service.closeOrChangeBankAccount(DECODED_OWNER, {
          bank_account_id: OPEN_PTA.bank_account_id,
          closing_mode: 'Closed',
          closing_effective_date: new Date('2026-05-01T00:00:00Z'),
        } as any),
      ).rejects.toThrow(/closing notice generation failed/i);
    });
  });

  describe('closeOrChangeBankAccount — Transferred mode', () => {
    it('requires replacement-account details before persisting / triggering notices', async () => {
      const bag = buildService();
      bag.bankAccountsRepo.findOne.mockResolvedValue({ ...OPEN_RTA });

      const result = await bag.service.closeOrChangeBankAccount(DECODED_OWNER, {
        bank_account_id: OPEN_RTA.bank_account_id,
        closing_mode: 'Transferred',
        closing_effective_date: new Date('2026-05-01T00:00:00Z'),
      } as any);

      expect(result.warning).toBe(true);
      expect(result.warningMessage).toMatch(/replacement account details/i);
      expect(bag.entityManager.transaction).not.toHaveBeenCalled();
      expect(bag.noticeService.handleTriggerAccountNotices).not.toHaveBeenCalled();
    });

    it('persists transferred-target fields and fires closing-trigger fan-out (RTA)', async () => {
      const bag = buildService();
      bag.bankAccountsRepo.findOne.mockResolvedValue({ ...OPEN_RTA });

      const result = await bag.service.closeOrChangeBankAccount(DECODED_OWNER, {
        bank_account_id: OPEN_RTA.bank_account_id,
        closing_mode: 'Transferred',
        closing_effective_date: new Date('2026-05-01T00:00:00Z'),
        closing_target_account_name: 'RTA Replacement',
        closing_target_financial_institution: 'CBA',
        closing_target_bsb: '062000',
        closing_target_account_number: '7654321',
        closing_target_opening_date: new Date('2026-05-02T00:00:00Z'),
        mark_notices_as_sent: true,
      } as any);

      const [, patch] = bag.txnBankRepo.update.mock.calls[0];
      expect(patch.status).toBe('Transferred');
      expect(patch.closing_mode).toBe('Transferred');
      expect(patch.closing_target_account_name).toBe('RTA Replacement');
      expect(patch.closing_target_financial_institution).toBe('CBA');
      expect(patch.closing_target_bsb).toBe('062000');
      expect(patch.closing_target_account_number).toBe('7654321');
      expect(patch.closing_target_opening_date).toBeInstanceOf(Date);

      expect(bag.noticeService.handleTriggerAccountNotices).toHaveBeenCalledWith(
        DECODED_OWNER,
        expect.objectContaining({
          bank_account_id: OPEN_RTA.bank_account_id,
          closing_trigger: true,
          mark_notices_as_sent: true,
        }),
        expect.anything(),
      );
      expect(bag.activityLogService.insertActivityLog.mock.calls[0][0].event_template_id).toBe(71);
      expect(result.successMessage).toMatch(/transferred/i);
    });
  });

  describe('closeOrChangeBankAccount — authorization & input guards', () => {
    it('rejects a caller whose JWT belongs to a different tenant (no notice fan-out)', async () => {
      const bag = buildService();
      bag.bankAccountsRepo.findOne.mockResolvedValue({ ...OPEN_PTA });

      const result = await bag.service.closeOrChangeBankAccount(
        DECODED_OTHER_TENANT,
        {
          bank_account_id: OPEN_PTA.bank_account_id,
          closing_mode: 'Closed',
          closing_effective_date: new Date('2026-05-01T00:00:00Z'),
        } as any,
      );

      expect(result.warning).toBe(true);
      expect(result.warningMessage).toMatch(/not authorized/i);
      expect(bag.entityManager.transaction).not.toHaveBeenCalled();
      expect(bag.noticeService.handleTriggerAccountNotices).not.toHaveBeenCalled();
      expect(bag.txnBankRepo.update).not.toHaveBeenCalled();
    });

    it('allows ADMIN impersonation across tenants', async () => {
      const bag = buildService();
      bag.bankAccountsRepo.findOne.mockResolvedValue({ ...OPEN_PTA });

      const result = await bag.service.closeOrChangeBankAccount(DECODED_ADMIN, {
        bank_account_id: OPEN_PTA.bank_account_id,
        closing_mode: 'Closed',
        closing_effective_date: new Date('2026-05-01T00:00:00Z'),
      } as any);

      expect(result.warning).toBeFalsy();
      expect(bag.noticeService.handleTriggerAccountNotices).toHaveBeenCalledTimes(1);
    });

    it("rejects 'Renamed' mode (reserved for internal rename path)", async () => {
      const bag = buildService();
      bag.bankAccountsRepo.findOne.mockResolvedValue({ ...OPEN_PTA });

      const result = await bag.service.closeOrChangeBankAccount(DECODED_OWNER, {
        bank_account_id: OPEN_PTA.bank_account_id,
        closing_mode: 'Renamed',
        closing_effective_date: new Date('2026-05-01T00:00:00Z'),
      } as any);

      expect(result.warning).toBe(true);
      expect(result.warningMessage).toMatch(/Renamed.*reserved/i);
      expect(bag.noticeService.handleTriggerAccountNotices).not.toHaveBeenCalled();
    });

    it('refuses to act on a non-Open account', async () => {
      const bag = buildService();
      bag.bankAccountsRepo.findOne.mockResolvedValue({ ...OPEN_PTA, status: 'Closed' });

      const result = await bag.service.closeOrChangeBankAccount(DECODED_OWNER, {
        bank_account_id: OPEN_PTA.bank_account_id,
        closing_mode: 'Closed',
        closing_effective_date: new Date('2026-05-01T00:00:00Z'),
      } as any);

      expect(result.warning).toBe(true);
      expect(result.warningMessage).toMatch(/Only 'Open' accounts are eligible/);
      expect(bag.noticeService.handleTriggerAccountNotices).not.toHaveBeenCalled();
    });
  });

  describe('editDetailsOfABankAccount — rename-only auto-trigger', () => {
    /**
     * Build an edit payload where account_name is the only
     * notice-content-affecting field that changes vs. accountDetails.
     */
    function buildRenamePayload() {
      return {
        bank_account_id: OPEN_PTA.bank_account_id,
        company_id: OPEN_PTA.company_id,
        account_name: 'PTA Renamed',
        account_number: OPEN_PTA.account_number,
        bsb_number: OPEN_PTA.bsb_number,
        financial_institution: OPEN_PTA.financial_institution,
        account_type: OPEN_PTA.account_type,
        project_ids: [7],
        client_supplier_id: OPEN_PTA.client_supplier_id,
        status: 'Open',
        contract_date: null,
        opening_date: null,
        contract_practical_completion_date: null,
        first_sub_contract_date: null,
        contract_value: null,
        delegate_powers: null,
      } as any;
    }

    function primeEdit(bag: ServiceBag, sentNoticeExists: boolean) {
      // The validator returns the input unchanged so we can hold the
      // shape stable in the fingerprint comparison.
      bag.bankAccountsValidator.validateEditDetailsOfABankAccount.mockImplementation(
        async (p: any) => ({ ...p }),
      );
      // `getBankDetails` (precondition) + accountDetails fetch
      bag.bankAccountsRepo.findOne.mockResolvedValue({ ...OPEN_PTA });
      // Inside-transaction rename-gate lookup
      bag.txnNoticeRepo.findOne.mockResolvedValue(
        sentNoticeExists
          ? {
              id: 'notice-uuid-1',
              notice_id: 555,
              status: 'Sent',
              notice_type: 'Client S18B Project Trust Account Notice',
            }
          : null,
      );
    }

    it('fires TA2 + Contracting Party Closing notices when a Sent S18B already exists', async () => {
      const bag = buildService();
      primeEdit(bag, true);

      await bag.service.editDetailsOfABankAccount(DECODED_OWNER, buildRenamePayload());

      // Two trigger invocations: regular regen (shouldTrigger via
      // contentChanged) + the rename closing trigger.
      const triggerCalls = bag.noticeService.handleTriggerAccountNotices.mock.calls;
      expect(triggerCalls.length).toBeGreaterThanOrEqual(1);
      const closingCall = triggerCalls.find((c) => c[1]?.closing_trigger === true);
      expect(closingCall).toBeDefined();
      expect(closingCall[1]).toEqual(
        expect.objectContaining({
          bank_account_id: OPEN_PTA.bank_account_id,
          closing_trigger: true,
        }),
      );

      // Closing context persisted onto bank_accounts inside the txn.
      const renamePersist = bag.txnBankRepo.update.mock.calls.find(
        (call) => call[1]?.closing_mode === 'Renamed',
      );
      expect(renamePersist).toBeDefined();
      expect(renamePersist[1].closing_previous_account_name).toBe(OPEN_PTA.account_name);
      expect(renamePersist[1].closing_effective_date).toBeInstanceOf(Date);
    });

    it('does NOT fire the closing trigger when no Sent S18B/TA1 exists', async () => {
      const bag = buildService();
      primeEdit(bag, false);

      await bag.service.editDetailsOfABankAccount(DECODED_OWNER, buildRenamePayload());

      const triggerCalls = bag.noticeService.handleTriggerAccountNotices.mock.calls;
      const closingCall = triggerCalls.find((c) => c[1]?.closing_trigger === true);
      expect(closingCall).toBeUndefined();

      const renamePersist = bag.txnBankRepo.update.mock.calls.find(
        (call) => call[1]?.closing_mode === 'Renamed',
      );
      expect(renamePersist).toBeUndefined();
    });
  });
});
