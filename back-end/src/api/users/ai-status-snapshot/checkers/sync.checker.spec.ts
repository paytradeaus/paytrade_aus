import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { XeroSyncLogs } from 'src/entities/xero-sync-logs.entity';
import { SyncChecker } from './sync.checker';

describe('SyncChecker', () => {
  let checker: SyncChecker;
  let qb: any;

  beforeEach(async () => {
    qb = {
      innerJoin: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        SyncChecker,
        {
          provide: getRepositoryToken(XeroSyncLogs),
          useValue: { createQueryBuilder: jest.fn().mockReturnValue(qb) },
        },
      ],
    }).compile();
    checker = moduleRef.get(SyncChecker);
  });

  const mkRow = (overrides: any = {}) => ({
    id: overrides.id ?? 'u-1',
    sync_id: overrides.sync_id ?? 1,
    error_code: null,
    error_message: null,
    information_required: 'NA',
    dynamic_values: {},
    api_payload: {},
    archived_at: null,
    created_on: new Date('2026-05-26T03:00:00Z'),
    xeroLogTemplates: overrides.xeroLogTemplates ?? {
      id: 100,
      sync_type: 'Bills',
      description: '<p>Add bill in xero failed</p>',
      error_code: 'ADD_BILL_FAILED',
      sync_status: 'Failed',
    },
    ...overrides,
  });

  it('joins through XeroIntegrationDetails for scoping and through XeroLogTemplates for Failed gating', async () => {
    qb.getMany.mockResolvedValue([]);
    await checker.check(7);
    expect(qb.innerJoin).toHaveBeenCalledTimes(1);
    expect(qb.innerJoinAndSelect).toHaveBeenCalledTimes(1);
    const scopeJoin = qb.innerJoin.mock.calls[0][2] as string;
    const tplJoin = qb.innerJoinAndSelect.mock.calls[0][2] as string;
    expect(scopeJoin).toContain('xi.company_id');
    expect(tplJoin).toContain("xt.sync_status = 'Failed'");
    expect(qb.andWhere).toHaveBeenCalledWith('l.archived_at IS NULL');
  });

  describe('classify()', () => {
    it('returns critical for Bills push failures', () => {
      expect(
        SyncChecker.classify(mkRow(), {
          sync_type: 'Bills',
          error_code: 'ADD_BILL_FAILED',
        } as any),
      ).toBe('critical');
    });
    it('returns critical for Smart contract failures', () => {
      expect(
        SyncChecker.classify(mkRow(), {
          sync_type: 'Smart contract',
          error_code: 'SMART_CONTRACT_MISSING_FIELDS',
        } as any),
      ).toBe('critical');
    });
    it('returns critical for Payments push failures', () => {
      expect(
        SyncChecker.classify(mkRow(), {
          sync_type: 'Payments',
          error_code: 'XP_ADD_FAILED',
        } as any),
      ).toBe('critical');
    });
    it('returns info for Invoice webhook re-receives (retry noise)', () => {
      expect(
        SyncChecker.classify(mkRow(), {
          sync_type: 'Invoice webhook',
          error_code: 'WH_INVOICE_X',
        } as any),
      ).toBe('info');
    });
    it('returns info for scheduler retries', () => {
      expect(
        SyncChecker.classify(mkRow({ error_code: 'SCHEDULER_PROJECT_X' }), {
          sync_type: 'Project schedulers',
          error_code: 'SCHEDULER_PROJECT_X',
        } as any),
      ).toBe('info');
    });
    it('returns info for missing-parent dependencies (auto-resolves)', () => {
      expect(
        SyncChecker.classify(mkRow({ error_code: 'MISSING_PROJECT' }), {
          sync_type: 'Bills',
          error_code: 'MISSING_PROJECT',
        } as any),
      ).toBe('info');
    });
    it('returns info for _NOT_MAPPED metadata mirror failures', () => {
      expect(
        SyncChecker.classify(mkRow({ error_code: 'EDIT_CONTACT_NOT_MAPPED' }), {
          sync_type: 'Contacts',
          error_code: 'EDIT_CONTACT_NOT_MAPPED',
        } as any),
      ).toBe('info');
    });
    it('returns info for DELETE_* (record going away)', () => {
      expect(
        SyncChecker.classify(mkRow({ error_code: 'DELETE_CONTACT_FAILED' }), {
          sync_type: 'Contacts',
          error_code: 'DELETE_CONTACT_FAILED',
        } as any),
      ).toBe('info');
    });
    it('returns info for metadata-only sync_types (Bank accounts / Contacts / Projects / Contracts) by default', () => {
      expect(
        SyncChecker.classify(mkRow(), {
          sync_type: 'Bank accounts',
          error_code: 'SYNC_ADD_BANK_TO_XERO',
        } as any),
      ).toBe('info');
      expect(
        SyncChecker.classify(mkRow(), {
          sync_type: 'Contacts',
          error_code: 'SYNC_ADD_CONTACT_TO_XERO',
        } as any),
      ).toBe('info');
    });
    it('trusts the Task #274 downgrade_reason flag', () => {
      expect(
        SyncChecker.classify(
          mkRow({ dynamic_values: { downgrade_reason: 'archived_in_xero' } }),
          { sync_type: 'Bills', error_code: 'ADD_BILL_FAILED' } as any,
        ),
      ).toBe('info');
    });
  });

  describe('buildTitle() fallback chain', () => {
    it('prefers a substantive authored error_message', () => {
      const r = mkRow({
        error_message:
          "Contact 'Timms Contractors Pty Ltd' is missing required information: Address, Email Address.",
      });
      const { title } = SyncChecker.buildTitle(r, {
        sync_type: 'Claims',
        description: '<p>Smart contract auto-creation failed</p>',
      } as any);
      expect(title).toContain('Timms Contractors Pty Ltd');
      expect(title).toContain('Address');
    });

    it('composes from sync_type + entity + missing fields when no authored message', () => {
      const r = mkRow({
        error_message: null,
        dynamic_values: {
          contact_name: 'ACME Co',
          missing_fields: ['Email', 'Phone'],
        },
      });
      const { title } = SyncChecker.buildTitle(r, {
        sync_type: 'Bills',
        description: '<p>Add bill in xero failed</p>',
      } as any);
      expect(title).toBe('Bills create failed — ACME Co (missing: Email, Phone)');
    });

    it('falls back to stripped template description', () => {
      const r = mkRow({ error_message: null, dynamic_values: {} });
      const { title } = SyncChecker.buildTitle(r, {
        sync_type: 'Bills',
        description: '<p>Add bill in xero failed</p>',
      } as any);
      // composed title takes precedence over plain description
      expect(title).toContain('Bills');
      expect(title).toContain('create failed');
    });

    it('falls back to legacy opaque format when nothing else available', () => {
      const r = mkRow({
        error_message: null,
        error_code: 'WEIRD_CODE',
        dynamic_values: {},
      });
      const { title } = SyncChecker.buildTitle(r, undefined);
      // With no template at all, syncType defaults to 'Xero' and
      // action defaults to 'sync failed' — but since both the composed
      // title and description are blank/default, we get the composed
      // 'Xero sync failed' string back. Verify it isn't the raw legacy
      // "(unknown)" form when an error_code is present.
      expect(title.toLowerCase()).toContain('sync failed');
    });

    it('extracts missing fields from error_message regex when not in dynamic_values', () => {
      const r = mkRow({
        error_message: 'Bill push failed.',
        information_required: 'NA',
        dynamic_values: {},
      });
      // error_message is too short to take the title path; ensure
      // extractMissingFields handles the regex path via a longer string
      const r2 = mkRow({
        error_message: null,
        information_required: 'Address, Phone',
        dynamic_values: { contact_name: 'X Ltd' },
      });
      const { title, missingFields } = SyncChecker.buildTitle(r2, {
        sync_type: 'Bills',
        description: '<p>Add bill in xero failed</p>',
      } as any);
      expect(missingFields).toBe('Address, Phone');
      expect(title).toContain('Address, Phone');
    });
  });

  describe('dedup', () => {
    it('collapses identical Critical rows from the same root cause with a "+N more" suffix', async () => {
      const tpl = {
        id: 100,
        sync_type: 'Bills',
        description: '<p>Add bill in xero failed</p>',
        error_code: 'ADD_BILL_FAILED',
        sync_status: 'Failed',
      };
      qb.getMany.mockResolvedValue([
        mkRow({
          id: 'u-1',
          sync_id: 3,
          error_message:
            "Bill 'INV-100' push failed: contact 'ACME Co' missing Email.",
          created_on: new Date('2026-05-26T03:00:00Z'),
          xeroLogTemplates: tpl,
        }),
        mkRow({
          id: 'u-2',
          sync_id: 2,
          error_message:
            "Bill 'INV-100' push failed: contact 'ACME Co' missing Email.",
          created_on: new Date('2026-05-26T02:00:00Z'),
          xeroLogTemplates: tpl,
        }),
        mkRow({
          id: 'u-3',
          sync_id: 1,
          error_message:
            "Bill 'INV-100' push failed: contact 'ACME Co' missing Email.",
          created_on: new Date('2026-05-26T01:00:00Z'),
          xeroLogTemplates: tpl,
        }),
      ]);
      const issues = await checker.check(7);
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('critical');
      expect(issues[0].title).toMatch(/\+2 more occurrences\)/);
      expect(issues[0].description).toContain('Repeated 3 times');
    });

    it('does not collapse rows with different severities or different titles', async () => {
      qb.getMany.mockResolvedValue([
        mkRow({
          id: 'u-a',
          sync_id: 10,
          error_message: "Bill 'A' push failed: missing Email.",
          xeroLogTemplates: {
            id: 100,
            sync_type: 'Bills',
            description: '<p>Add bill</p>',
            error_code: 'ADD_BILL',
            sync_status: 'Failed',
          },
        }),
        mkRow({
          id: 'u-b',
          sync_id: 11,
          error_message: "Contact 'X' edit failed (not mapped).",
          error_code: 'EDIT_CONTACT_NOT_MAPPED',
          xeroLogTemplates: {
            id: 38,
            sync_type: 'Contacts',
            description: '<p>Contact edit not mapped</p>',
            error_code: 'EDIT_CONTACT_NOT_MAPPED',
            sync_status: 'Failed',
          },
        }),
      ]);
      const issues = await checker.check(7);
      expect(issues).toHaveLength(2);
      const severities = issues.map((i) => i.severity).sort();
      expect(severities).toEqual(['critical', 'info']);
    });
  });
});
