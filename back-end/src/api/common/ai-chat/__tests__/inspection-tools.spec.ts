import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClientSuppliersDetails } from '../../../../entities/client-suppliers-details.entity';
import { PaymentClaims, BankAccounts } from '../../../../entities/banking.entity';
import { ContractDetails } from '../../../../entities/contract-details.entity';
import { ProjectDetails } from '../../../../entities/project-details.entity';
import { CompanyUserRoles } from '../../../../entities/company-user-roles.entity';
import { RetentionDetails } from '../../../../entities/retention-details.entity';
import { XeroIntegrationDetails } from '../../../../entities/xero-integration-details.entity';
import { XeroSyncLogs } from '../../../../entities/xero-sync-logs.entity';
import { AiChatInspectionService } from '../services/inspection.service';
import { ListProjectsWithIssuesTool } from '../tools/list-projects-with-issues.tool';
import { GetRetentionsHeldTool } from '../tools/get-retentions-held.tool';
import { GetTrustAccountBalancesTool } from '../tools/get-trust-account-balances.tool';
import { GetXeroSyncStatusTool } from '../tools/get-xero-sync-status.tool';
import { AiToolError } from '../../ai-tools/ai-tool.interface';

/**
 * Task #217 — locks the company-membership gating, happy-path output,
 * and no-data behaviour of the four read-only inspection tools.
 *
 * The model can lie about `companyId`, so every read goes through
 * `assertMembership` against `company_user_roles`. A regression there
 * would silently leak another business's data; these tests pin that
 * contract.
 */

function makeQb(): any {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getOne: jest.fn().mockResolvedValue(null),
  };
}

function makeRepo(qb: any = makeQb()) {
  return {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    findOne: jest.fn(),
    _qb: qb,
  };
}

interface Repos {
  claim: ReturnType<typeof makeRepo>;
  contact: ReturnType<typeof makeRepo>;
  contract: ReturnType<typeof makeRepo>;
  project: ReturnType<typeof makeRepo>;
  userRoles: ReturnType<typeof makeRepo>;
  retention: ReturnType<typeof makeRepo>;
  bank: ReturnType<typeof makeRepo>;
  xeroIntegration: ReturnType<typeof makeRepo>;
  xeroSyncLog: ReturnType<typeof makeRepo>;
}

async function buildService(): Promise<{
  service: AiChatInspectionService;
  repos: Repos;
}> {
  const repos: Repos = {
    claim: makeRepo(),
    contact: makeRepo(),
    contract: makeRepo(),
    project: makeRepo(),
    userRoles: makeRepo(),
    retention: makeRepo(),
    bank: makeRepo(),
    xeroIntegration: makeRepo(),
    xeroSyncLog: makeRepo(),
  };
  const moduleRef = await Test.createTestingModule({
    providers: [
      AiChatInspectionService,
      { provide: getRepositoryToken(PaymentClaims), useValue: repos.claim },
      { provide: getRepositoryToken(ClientSuppliersDetails), useValue: repos.contact },
      { provide: getRepositoryToken(ContractDetails), useValue: repos.contract },
      { provide: getRepositoryToken(ProjectDetails), useValue: repos.project },
      { provide: getRepositoryToken(CompanyUserRoles), useValue: repos.userRoles },
      { provide: getRepositoryToken(RetentionDetails), useValue: repos.retention },
      { provide: getRepositoryToken(BankAccounts), useValue: repos.bank },
      { provide: getRepositoryToken(XeroIntegrationDetails), useValue: repos.xeroIntegration },
      { provide: getRepositoryToken(XeroSyncLogs), useValue: repos.xeroSyncLog },
    ],
  }).compile();
  return { service: moduleRef.get(AiChatInspectionService), repos };
}

function allowMembership(repos: Repos, role = 'ADMIN') {
  repos.userRoles.findOne.mockResolvedValue({
    user_id: 1,
    company_id: 42,
    company_role: role,
  });
}

function denyMembership(repos: Repos) {
  repos.userRoles.findOne.mockResolvedValue(null);
}

// ─────────────────────────────────────────────────────────────────────────────
// listProjectsWithIssues
// ─────────────────────────────────────────────────────────────────────────────

describe('AiChatInspectionService.listProjectsWithIssues', () => {
  it('rejects when the user is not a member of the company (cross-tenant guard)', async () => {
    const { service, repos } = await buildService();
    denyMembership(repos);
    await expect(
      service.listProjectsWithIssues(1, 42),
    ).rejects.toThrow(/not a member of company 42/);
    // We must never even read from the project table on a denied call.
    expect(repos.project.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('returns an empty array when the company has no projects with issues', async () => {
    const { service, repos } = await buildService();
    allowMembership(repos);
    repos.project._qb.getMany.mockResolvedValue([]);
    await expect(service.listProjectsWithIssues(1, 42)).resolves.toEqual([]);
  });

  it('skips healthy projects and surfaces issue strings for problematic ones', async () => {
    const { service, repos } = await buildService();
    allowMembership(repos);
    repos.project._qb.getMany.mockResolvedValue([
      {
        project_id: 1,
        project_name: 'Healthy',
        project_status: 'In Progress',
        project_role: 'Head Contractor',
        site_address: '1 Main St',
        head_contract_sum: 100000,
        retention_type: 'Cash',
        pta_eligibility: 'No',
        rta_eligibility: 'No',
        pta_compliance: 'Ok',
        rta_compliance: 'Ok',
      },
      {
        project_id: 2,
        project_name: 'Broken',
        project_status: 'In Progress',
        project_role: null,
        site_address: '',
        head_contract_sum: 0,
        retention_type: null,
        pta_eligibility: 'Yes',
        rta_eligibility: 'Yes',
        pta_compliance: 'Action Required',
        rta_compliance: 'Action Required',
      },
    ]);
    const out = await service.listProjectsWithIssues(1, 42);
    expect(out).toHaveLength(1);
    expect(out[0].projectId).toBe(2);
    expect(out[0].issues).toEqual(
      expect.arrayContaining([
        'PTA compliance: action required.',
        'RTA compliance: action required.',
        'Site address is missing.',
        'Project role is not set.',
        'Head contract sum is missing or zero.',
        'Retention type is not set.',
      ]),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getRetentionsHeld
// ─────────────────────────────────────────────────────────────────────────────

describe('AiChatInspectionService.getRetentionsHeld', () => {
  it('rejects cross-tenant reads', async () => {
    const { service, repos } = await buildService();
    denyMembership(repos);
    await expect(service.getRetentionsHeld(1, 42)).rejects.toThrow(
      /not a member of company 42/,
    );
    expect(repos.retention.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('returns zeroed totals and no groups when nothing is retained', async () => {
    const { service, repos } = await buildService();
    allowMembership(repos);
    repos.retention._qb.getMany.mockResolvedValue([]);
    const out = await service.getRetentionsHeld(1, 42);
    expect(out).toEqual({
      totalRetainedAmount: 0,
      totalRetainedCount: 0,
      groups: [],
    });
  });

  it('groups by beneficiary + counterparty and hydrates names for top groups', async () => {
    const { service, repos } = await buildService();
    allowMembership(repos);
    repos.retention._qb.getMany.mockResolvedValue([
      { retained_amount: 100, beneficiary_type: 'subcontractor', client_supplier_id: 7 },
      { retained_amount: 50, beneficiary_type: 'subcontractor', client_supplier_id: 7 },
      { retained_amount: 200, beneficiary_type: 'principal', client_supplier_id: 9 },
    ]);
    repos.contact._qb.getMany.mockResolvedValue([
      { client_supplier_id: 7, business_name: 'Sub Co', client_supplier_name: 'Sub Co' },
      { client_supplier_id: 9, business_name: 'Principal Co', client_supplier_name: 'Principal Co' },
    ]);
    const out = await service.getRetentionsHeld(1, 42);
    expect(out.totalRetainedAmount).toBe(350);
    expect(out.totalRetainedCount).toBe(3);
    expect(out.groups).toHaveLength(2);
    // Sorted by total desc, so principal (200) is first.
    expect(out.groups[0]).toMatchObject({
      beneficiaryType: 'principal',
      clientSupplierId: 9,
      counterpartyName: 'Principal Co',
      retainedCount: 1,
      totalRetainedAmount: 200,
    });
    expect(out.groups[1]).toMatchObject({
      beneficiaryType: 'subcontractor',
      clientSupplierId: 7,
      counterpartyName: 'Sub Co',
      retainedCount: 2,
      totalRetainedAmount: 150,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getTrustAccountBalances
// ─────────────────────────────────────────────────────────────────────────────

describe('AiChatInspectionService.getTrustAccountBalances', () => {
  it('rejects cross-tenant reads', async () => {
    const { service, repos } = await buildService();
    denyMembership(repos);
    await expect(service.getTrustAccountBalances(1, 42)).rejects.toThrow(
      /not a member of company 42/,
    );
    expect(repos.bank.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('returns an empty list when there are no trust accounts', async () => {
    const { service, repos } = await buildService();
    allowMembership(repos);
    repos.bank._qb.getMany.mockResolvedValue([]);
    await expect(service.getTrustAccountBalances(1, 42)).resolves.toEqual([]);
  });

  it('maps trust accounts and masks all but the last four digits', async () => {
    const { service, repos } = await buildService();
    allowMembership(repos);
    repos.bank._qb.getMany.mockResolvedValue([
      {
        bank_account_id: 100,
        account_name: 'PTA',
        account_type: 'Project Trust Account',
        status: 'Active',
        current_balance: '1500.50',
        account_number: '123456789',
        bsb_number: 12345,
        project_ids: ['5', '6'],
      },
      {
        bank_account_id: 101,
        account_name: 'RTA',
        account_type: 'Retention Trust Account',
        status: 'Active',
        current_balance: null,
        account_number: null,
        bsb_number: null,
        project_ids: null,
      },
    ]);
    const out = await service.getTrustAccountBalances(1, 42);
    expect(out).toEqual([
      {
        bankAccountId: 100,
        accountName: 'PTA',
        accountType: 'Project Trust Account',
        status: 'Active',
        currentBalance: 1500.5,
        lastFourDigits: '6789',
        bsb: 12345,
        projectIds: [5, 6],
      },
      {
        bankAccountId: 101,
        accountName: 'RTA',
        accountType: 'Retention Trust Account',
        status: 'Active',
        currentBalance: null,
        lastFourDigits: null,
        bsb: null,
        projectIds: null,
      },
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getXeroSyncStatus
// ─────────────────────────────────────────────────────────────────────────────

describe('AiChatInspectionService.getXeroSyncStatus', () => {
  it('rejects cross-tenant reads', async () => {
    const { service, repos } = await buildService();
    denyMembership(repos);
    await expect(service.getXeroSyncStatus(1, 42)).rejects.toThrow(
      /not a member of company 42/,
    );
    expect(repos.xeroIntegration.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('returns connected=false with a friendly note when no integration exists', async () => {
    const { service, repos } = await buildService();
    allowMembership(repos);
    repos.xeroIntegration._qb.getOne.mockResolvedValue(null);
    const out = await service.getXeroSyncStatus(1, 42);
    expect(out.connected).toBe(false);
    expect(out.tenantName).toBeNull();
    expect(out.recentSyncLogCount).toBe(0);
    expect(out.recentSyncErrorCount).toBe(0);
    expect(out.notes).toEqual([
      'No Xero integration is connected for this business.',
    ]);
    // Should never query sync logs without an integration.
    expect(repos.xeroSyncLog.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('summarises recent sync logs and adds a re-auth note when needed', async () => {
    const { service, repos } = await buildService();
    allowMembership(repos);
    const reauthSince = new Date('2026-05-01T00:00:00Z');
    repos.xeroIntegration._qb.getOne.mockResolvedValue({
      integration_id: 11,
      tenant_name: 'Acme Co',
      status: 'Inactive',
      needs_reauth: true,
      needs_reauth_since: reauthSince,
      last_inactive_email_sent_at: null,
    });
    const recent = new Date('2026-05-14T12:00:00Z');
    const older = new Date('2026-05-13T08:00:00Z');
    repos.xeroSyncLog._qb.getMany.mockResolvedValue([
      { created_on: recent, error_message: null, error_code: null },
      { created_on: older, error_message: 'boom', error_code: null },
    ]);
    const out = await service.getXeroSyncStatus(1, 42);
    expect(out.connected).toBe(true);
    expect(out.tenantName).toBe('Acme Co');
    expect(out.needsReauth).toBe(true);
    expect(out.needsReauthSince).toBe(reauthSince.toISOString());
    expect(out.recentSyncLogCount).toBe(2);
    expect(out.recentSyncErrorCount).toBe(1);
    expect(out.lastSyncAt).toBe(recent.toISOString());
    expect(out.notes).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/needs re-authentication/),
        expect.stringMatching(/1 sync log in the last 7 days reported an error/),
      ]),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tool wrappers — auth + companyId gating, server-context priority
// ─────────────────────────────────────────────────────────────────────────────

function makeInspectionStub() {
  return {
    listProjectsWithIssues: jest.fn().mockResolvedValue([]),
    getRetentionsHeld: jest.fn().mockResolvedValue({
      totalRetainedAmount: 0,
      totalRetainedCount: 0,
      groups: [],
    }),
    getTrustAccountBalances: jest.fn().mockResolvedValue([]),
    getXeroSyncStatus: jest.fn().mockResolvedValue({
      connected: false,
      tenantName: null,
      status: null,
      needsReauth: false,
      needsReauthSince: null,
      lastInactiveEmailSentAt: null,
      recentSyncLogCount: 0,
      recentSyncErrorCount: 0,
      lastSyncAt: null,
      notes: [],
    }),
  };
}

describe('ListProjectsWithIssuesTool', () => {
  it('refuses to run without an authenticated user', async () => {
    const tool = new ListProjectsWithIssuesTool(makeInspectionStub() as any);
    await expect(tool.execute({}, {})).rejects.toBeInstanceOf(AiToolError);
  });

  it('refuses to run without a companyId in context or input', async () => {
    const tool = new ListProjectsWithIssuesTool(makeInspectionStub() as any);
    await expect(
      tool.execute({}, { userId: 1 }),
    ).rejects.toBeInstanceOf(AiToolError);
  });

  it('prefers the server-side companyId over the model-supplied one', async () => {
    const stub = makeInspectionStub();
    const tool = new ListProjectsWithIssuesTool(stub as any);
    await tool.execute({ companyId: 999, limit: 5 }, { userId: 7, companyId: 42 });
    expect(stub.listProjectsWithIssues).toHaveBeenCalledWith(7, 42, 5);
  });

  it('propagates the membership-denied error from the inspection service', async () => {
    const stub = makeInspectionStub();
    stub.listProjectsWithIssues.mockRejectedValue(
      new Error('User 7 is not a member of company 999'),
    );
    const tool = new ListProjectsWithIssuesTool(stub as any);
    await expect(
      tool.execute({ companyId: 999 }, { userId: 7 }),
    ).rejects.toThrow(/not a member of company 999/);
  });

  it('returns an empty projects list when no data is found', async () => {
    const stub = makeInspectionStub();
    const tool = new ListProjectsWithIssuesTool(stub as any);
    await expect(
      tool.execute({}, { userId: 7, companyId: 42 }),
    ).resolves.toEqual({ projects: [] });
  });
});

describe('GetRetentionsHeldTool', () => {
  it('refuses to run without an authenticated user', async () => {
    const tool = new GetRetentionsHeldTool(makeInspectionStub() as any);
    await expect(tool.execute({}, {})).rejects.toBeInstanceOf(AiToolError);
  });

  it('refuses to run without a companyId in context or input', async () => {
    const tool = new GetRetentionsHeldTool(makeInspectionStub() as any);
    await expect(tool.execute({}, { userId: 1 })).rejects.toBeInstanceOf(
      AiToolError,
    );
  });

  it('uses the server-side companyId and forwards the limit', async () => {
    const stub = makeInspectionStub();
    const tool = new GetRetentionsHeldTool(stub as any);
    await tool.execute({ companyId: 999, limit: 3 }, { userId: 7, companyId: 42 });
    expect(stub.getRetentionsHeld).toHaveBeenCalledWith(7, 42, 3);
  });

  it('propagates membership-denied errors', async () => {
    const stub = makeInspectionStub();
    stub.getRetentionsHeld.mockRejectedValue(
      new Error('User 7 is not a member of company 999'),
    );
    const tool = new GetRetentionsHeldTool(stub as any);
    await expect(
      tool.execute({ companyId: 999 }, { userId: 7 }),
    ).rejects.toThrow(/not a member of company 999/);
  });

  it('returns the zeroed shape when nothing is retained', async () => {
    const tool = new GetRetentionsHeldTool(makeInspectionStub() as any);
    await expect(
      tool.execute({}, { userId: 7, companyId: 42 }),
    ).resolves.toEqual({
      totalRetainedAmount: 0,
      totalRetainedCount: 0,
      groups: [],
    });
  });
});

describe('GetTrustAccountBalancesTool', () => {
  it('refuses to run without an authenticated user', async () => {
    const tool = new GetTrustAccountBalancesTool(makeInspectionStub() as any);
    await expect(tool.execute({}, {})).rejects.toBeInstanceOf(AiToolError);
  });

  it('refuses to run without a companyId in context or input', async () => {
    const tool = new GetTrustAccountBalancesTool(makeInspectionStub() as any);
    await expect(tool.execute({}, { userId: 1 })).rejects.toBeInstanceOf(
      AiToolError,
    );
  });

  it('uses the server-side companyId in preference to the model-supplied one', async () => {
    const stub = makeInspectionStub();
    const tool = new GetTrustAccountBalancesTool(stub as any);
    await tool.execute({ companyId: 999 }, { userId: 7, companyId: 42 });
    expect(stub.getTrustAccountBalances).toHaveBeenCalledWith(7, 42);
  });

  it('propagates membership-denied errors', async () => {
    const stub = makeInspectionStub();
    stub.getTrustAccountBalances.mockRejectedValue(
      new Error('User 7 is not a member of company 999'),
    );
    const tool = new GetTrustAccountBalancesTool(stub as any);
    await expect(
      tool.execute({ companyId: 999 }, { userId: 7 }),
    ).rejects.toThrow(/not a member of company 999/);
  });

  it('returns an empty accounts list when there are no trust accounts', async () => {
    const tool = new GetTrustAccountBalancesTool(makeInspectionStub() as any);
    await expect(
      tool.execute({}, { userId: 7, companyId: 42 }),
    ).resolves.toEqual({ accounts: [] });
  });
});

describe('GetXeroSyncStatusTool', () => {
  it('refuses to run without an authenticated user', async () => {
    const tool = new GetXeroSyncStatusTool(makeInspectionStub() as any);
    await expect(tool.execute({}, {})).rejects.toBeInstanceOf(AiToolError);
  });

  it('refuses to run without a companyId in context or input', async () => {
    const tool = new GetXeroSyncStatusTool(makeInspectionStub() as any);
    await expect(tool.execute({}, { userId: 1 })).rejects.toBeInstanceOf(
      AiToolError,
    );
  });

  it('uses the server-side companyId in preference to the model-supplied one', async () => {
    const stub = makeInspectionStub();
    const tool = new GetXeroSyncStatusTool(stub as any);
    await tool.execute({ companyId: 999 }, { userId: 7, companyId: 42 });
    expect(stub.getXeroSyncStatus).toHaveBeenCalledWith(7, 42);
  });

  it('propagates membership-denied errors', async () => {
    const stub = makeInspectionStub();
    stub.getXeroSyncStatus.mockRejectedValue(
      new Error('User 7 is not a member of company 999'),
    );
    const tool = new GetXeroSyncStatusTool(stub as any);
    await expect(
      tool.execute({ companyId: 999 }, { userId: 7 }),
    ).rejects.toThrow(/not a member of company 999/);
  });

  it('returns the not-connected shape when there is no integration', async () => {
    const tool = new GetXeroSyncStatusTool(makeInspectionStub() as any);
    const out = await tool.execute({}, { userId: 7, companyId: 42 });
    expect(out.connected).toBe(false);
    expect(out.tenantName).toBeNull();
  });
});
