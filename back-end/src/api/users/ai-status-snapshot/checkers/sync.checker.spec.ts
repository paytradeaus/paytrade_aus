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
    reference: {},
    project_id: null,
    contract_id: null,
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

  it('joins through XeroIntegrationDetails for scoping and through XeroLogTemplates for Failed gating, with archived rows excluded', async () => {
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
    const cases: Array<[string, any, any, 'critical' | 'info']> = [
      ['Bills push failure', {}, { sync_type: 'Bills', error_code: 'ADD_BILL_FAILED' }, 'critical'],
      ['Smart contract failure', {}, { sync_type: 'Smart contract', error_code: 'SMART_CONTRACT_X' }, 'critical'],
      ['Payments push failure', {}, { sync_type: 'Payments', error_code: 'XP_ADD_FAILED' }, 'critical'],
      ['Claims push failure', {}, { sync_type: 'Claims', error_code: 'ADD_CLAIM_FAILED' }, 'critical'],
      ['Retention journals failure', {}, { sync_type: 'Retention journals', error_code: 'RETENTION_JOURNAL_X' }, 'critical'],
      ['Trust movements failure', {}, { sync_type: 'Trust movements', error_code: 'TM_PUSH_FAILED' }, 'critical'],
      ['Invoice webhook retry', {}, { sync_type: 'Invoice webhook', error_code: 'WH_INVOICE_X' }, 'info'],
      ['Project schedulers retry', { error_code: 'SCHEDULER_PROJECT_X' }, { sync_type: 'Project schedulers', error_code: 'SCHEDULER_PROJECT_X' }, 'info'],
      ['MISSING_PROJECT on Bills', { error_code: 'MISSING_PROJECT' }, { sync_type: 'Bills', error_code: 'MISSING_PROJECT' }, 'info'],
      ['EDIT_CONTACT_NOT_MAPPED', { error_code: 'EDIT_CONTACT_NOT_MAPPED' }, { sync_type: 'Contacts', error_code: 'EDIT_CONTACT_NOT_MAPPED' }, 'info'],
      ['DELETE_CONTACT_FAILED', { error_code: 'DELETE_CONTACT_FAILED' }, { sync_type: 'Contacts', error_code: 'DELETE_CONTACT_FAILED' }, 'info'],
      // *_CONTACT_INCOMPLETE is a pre-flight validation block on the
      // claim/bill push (no API call attempted). Downgrade to info so
      // it doesn't show as critical alongside genuine sync failures.
      ['SMART_CONTRACT_CONTACT_INCOMPLETE on Claims', { error_code: 'SMART_CONTRACT_CONTACT_INCOMPLETE' }, { sync_type: 'Claims', error_code: 'SMART_CONTRACT_CONTACT_INCOMPLETE' }, 'info'],
      ['Bank accounts add (metadata)', {}, { sync_type: 'Bank accounts', error_code: 'SYNC_ADD_BANK_TO_XERO' }, 'info'],
      ['Contacts add (metadata)', {}, { sync_type: 'Contacts', error_code: 'SYNC_ADD_CONTACT_TO_XERO' }, 'info'],
    ];
    for (const [name, rowOverrides, tpl, expected] of cases) {
      it(`returns '${expected}' for ${name}`, () => {
        expect(SyncChecker.classify(mkRow(rowOverrides), tpl)).toBe(expected);
      });
    }
    it('trusts the Task #274 downgrade_reason flag even when sync_type would otherwise be critical', () => {
      expect(
        SyncChecker.classify(
          mkRow({ dynamic_values: { downgrade_reason: 'archived_in_xero' } }),
          { sync_type: 'Bills', error_code: 'ADD_BILL_FAILED' } as any,
        ),
      ).toBe('info');
    });
    it('never emits warning — checker is intentionally binary critical | info', () => {
      const samples = [
        SyncChecker.classify(mkRow(), { sync_type: 'Bills' } as any),
        SyncChecker.classify(mkRow(), { sync_type: 'Bank accounts' } as any),
        SyncChecker.classify(mkRow(), { sync_type: 'Whatever' } as any),
      ];
      expect(samples).not.toContain('warning');
    });
  });

  describe('extractLinkedRefs() + formatLinkedRefs()', () => {
    it('pulls project/contract/claim ids from columns and names from dynamic_values', () => {
      const refs = SyncChecker.extractLinkedRefs(
        mkRow({
          project_id: '11111111-2222-3333-4444-555555555555',
          contract_id: '99999999-aaaa-bbbb-cccc-dddddddddddd',
          dynamic_values: {
            project_name: '2501 - Alba',
            contract_name: 'Main',
            claim_id: 'PC-12',
          },
        }) as any,
      );
      expect(refs.projectId).toBe('11111111-2222-3333-4444-555555555555');
      expect(refs.projectName).toBe('2501 - Alba');
      expect(refs.contractId).toBe('99999999-aaaa-bbbb-cccc-dddddddddddd');
      expect(refs.contractName).toBe('Main');
      expect(refs.claimId).toBe('PC-12');
    });

    it('renders display names when available and abbreviates raw UUIDs', () => {
      const out = SyncChecker.formatLinkedRefs({
        projectId: '11111111-2222-3333-4444-555555555555',
        projectName: '2501 - Alba',
        contractId: '99999999-aaaa-bbbb-cccc-dddddddddddd',
        contractName: null,
        claimId: 'PC-12',
        claimRef: null,
        invoiceId: null,
        invoiceRef: 'INV-100',
        billId: null,
        billRef: null,
      });
      expect(out).toBe(' (Project: 2501 - Alba · Contract: 99999999 · Claim: PC-12 · Invoice: INV-100)');
    });

    it('returns empty string when no refs are set', () => {
      const out = SyncChecker.formatLinkedRefs({
        projectId: null,
        projectName: null,
        contractId: null,
        contractName: null,
        claimId: null,
        claimRef: null,
        invoiceId: null,
        invoiceRef: null,
        billId: null,
        billRef: null,
      });
      expect(out).toBe('');
    });
  });

  describe('buildTitle() fallback chain + linked-ref suffix', () => {
    it('prefers a substantive authored error_message and appends linked refs the message does not already mention', () => {
      const r = mkRow({
        error_message:
          "Bill 'INV-100' push failed: contact 'ACME Co' missing Email.",
        dynamic_values: { contact_name: 'ACME Co', project_name: '2501 - Alba' },
      });
      const { title } = SyncChecker.buildTitle(r as any, {
        sync_type: 'Bills',
        description: '<p>Add bill in xero failed</p>',
      } as any);
      expect(title).toContain("Bill 'INV-100' push failed");
      // Project not mentioned in the message → suffix appended.
      expect(title).toContain('Project: 2501 - Alba');
    });

    it('does NOT re-append refs already present in the authored message', () => {
      const r = mkRow({
        error_message:
          "Project 2501 - Alba: bill push failed. ACME Co missing Email Address details.",
        dynamic_values: { project_name: '2501 - Alba' },
      });
      const { title } = SyncChecker.buildTitle(r as any, {
        sync_type: 'Bills',
        description: '<p>Add bill in xero failed</p>',
      } as any);
      // Project mentioned in the message → no duplicate suffix.
      expect((title.match(/2501 - Alba/g) || []).length).toBe(1);
    });

    it('composes from sync_type + entity + missing fields when no authored message, with refs appended', () => {
      const r = mkRow({
        error_message: null,
        dynamic_values: {
          contact_name: 'ACME Co',
          missing_fields: ['Email', 'Phone'],
          project_name: '2501 - Alba',
        },
      });
      const { title } = SyncChecker.buildTitle(r as any, {
        sync_type: 'Bills',
        description: '<p>Add bill in xero failed</p>',
      } as any);
      expect(title).toBe(
        'Bills create failed — ACME Co (missing: Email, Phone) (Project: 2501 - Alba)',
      );
    });

    it('truncates very long titles at the MAX_TITLE_LEN boundary', () => {
      const longMsg = 'X'.repeat(500);
      const { title } = SyncChecker.buildTitle(
        mkRow({ error_message: longMsg }) as any,
        { sync_type: 'Bills', description: '<p>Add bill</p>' } as any,
      );
      expect(title.length).toBeLessThanOrEqual(160);
      expect(title.endsWith('…')).toBe(true);
    });

    it('falls back to legacy "Xero sync failed" final fallback with refs when nothing else is available', () => {
      const r = mkRow({
        error_message: null,
        error_code: 'WEIRD_CODE',
        dynamic_values: { project_name: '2501 - Alba' },
      });
      const { title } = SyncChecker.buildTitle(r as any, undefined);
      // No template → composed default 'Xero sync failed' triggers legacy
      // fallback which still appends the linked-ref suffix.
      expect(title.toLowerCase()).toContain('sync failed');
      expect(title).toContain('Project: 2501 - Alba');
    });
  });

  describe('dedup', () => {
    it('collapses rows sharing the same structured root cause (template + entity + linked refs)', async () => {
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
          error_message: "Bill push attempt #3 failed for ACME Co.",
          dynamic_values: { contact_name: 'ACME Co', claim_id: 'PC-12' },
          created_on: new Date('2026-05-26T03:00:00Z'),
          xeroLogTemplates: tpl,
        }),
        mkRow({
          id: 'u-2',
          sync_id: 2,
          // wording drifted between retries — would NOT collapse on title
          error_message: "Bill push attempt #2 failed for ACME Co.",
          dynamic_values: { contact_name: 'ACME Co', claim_id: 'PC-12' },
          created_on: new Date('2026-05-26T02:00:00Z'),
          xeroLogTemplates: tpl,
        }),
        mkRow({
          id: 'u-3',
          sync_id: 1,
          error_message: "Bill push attempt #1 failed for ACME Co.",
          dynamic_values: { contact_name: 'ACME Co', claim_id: 'PC-12' },
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

    it('does NOT collapse rows with different entities (distinct root causes)', async () => {
      const tpl = {
        id: 100,
        sync_type: 'Bills',
        description: '<p>Add bill in xero failed</p>',
        error_code: 'ADD_BILL_FAILED',
        sync_status: 'Failed',
      };
      qb.getMany.mockResolvedValue([
        mkRow({
          id: 'u-a',
          sync_id: 10,
          error_message: "Bill push failed: missing Email field for contact.",
          dynamic_values: { contact_name: 'ACME Co' },
          xeroLogTemplates: tpl,
        }),
        mkRow({
          id: 'u-b',
          sync_id: 11,
          error_message: "Bill push failed: missing Email field for contact.",
          dynamic_values: { contact_name: 'Globex Corp' },
          xeroLogTemplates: tpl,
        }),
      ]);
      const issues = await checker.check(7);
      expect(issues).toHaveLength(2);
    });

    it('does NOT collapse rows with the same entity but different severities', async () => {
      qb.getMany.mockResolvedValue([
        mkRow({
          id: 'u-a',
          sync_id: 10,
          error_message: "Bill push failed: missing Email field for ACME Co.",
          dynamic_values: { contact_name: 'ACME Co' },
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
          error_code: 'EDIT_CONTACT_NOT_MAPPED',
          error_message: "Contact ACME Co edit failed (not mapped).",
          dynamic_values: { contact_name: 'ACME Co' },
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
      expect(issues.map((i) => i.severity).sort()).toEqual(['critical', 'info']);
    });
  });
});
