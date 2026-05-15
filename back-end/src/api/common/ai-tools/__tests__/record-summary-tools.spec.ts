import { GetClaimSummaryTool } from '../tools/get-claim-summary.tool';
import { GetContractSummaryTool } from '../tools/get-contract-summary.tool';
import { GetProjectSummaryTool } from '../tools/get-project-summary.tool';
import { RecordSummaryService } from '../services/record-summary.service';
import { AiToolError } from '../ai-tool.interface';
import { AiBillingConsumer } from '../../ai-billing/ai-billing-consumer.helper';

function makeConsumerStub() {
  return {
    consumeOrTopup: jest.fn(async () => ({
      ok: true as const,
      amountChargedUsd: 0,
      multiplier: 1.5,
      balanceBefore: 0,
      balanceAfter: 0,
      ledgerId: '',
    })),
  } as unknown as AiBillingConsumer & { consumeOrTopup: jest.Mock };
}

/**
 * Task #186 — page-context-aware record-lookup tools. Locks the
 * "server-side context wins, page-context entityId beats model input,
 * unauthenticated calls rejected" rules.
 */
describe('GetClaimSummaryTool', () => {
  it('refuses to run without an authenticated user', async () => {
    const tool = new GetClaimSummaryTool(
      {} as RecordSummaryService,
      makeConsumerStub(),
    );
    await expect(tool.execute({}, {})).rejects.toBeInstanceOf(AiToolError);
  });

  it('refuses to run without a claimId in either context or input', async () => {
    const tool = new GetClaimSummaryTool(
      {} as RecordSummaryService,
      makeConsumerStub(),
    );
    await expect(
      tool.execute({}, { userId: 1, companyId: 42 }),
    ).rejects.toBeInstanceOf(AiToolError);
  });

  it('prefers the page-context entityId over the model-supplied claimId and re-validates company membership', async () => {
    const stub = {
      getClaimForUser: jest.fn(async (userId, claimId, companyId) => ({
        claimId,
        companyId,
        status: 'Draft',
        listStatus: 'Draft',
        claimType: 'Billable',
        cashRetentionType: null,
        reference: 'C-1',
        claimAmount: 100,
        retentionAmount: null,
        retentionPercentage: null,
        paidAmount: null,
        outstandingAmount: null,
        dueDate: null,
        sentDate: null,
        receivedDate: null,
        contractId: null,
        contractName: null,
        projectId: null,
        projectName: null,
        counterpartyId: null,
        counterpartyName: null,
      })),
    };
    const consumer = makeConsumerStub();
    const tool = new GetClaimSummaryTool(stub as any, consumer);
    await tool.execute(
      { claimId: 999 },
      {
        userId: 7,
        companyId: 42,
        aiRunId: 'run-x',
        idempotencyKey: 'k',
        pageContext: { entity: 'claim', entityId: '456' },
      },
    );
    expect(stub.getClaimForUser).toHaveBeenCalledWith(7, 456, 42);
    expect(consumer.consumeOrTopup).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 42,
        idempotencyKey: 'run-x:getClaimSummary:k',
      }),
    );
  });

  it('falls back to the model-supplied claimId when the page context entity does not match', async () => {
    const stub = {
      getClaimForUser: jest.fn(async (userId, claimId, companyId) => ({
        claimId,
        companyId,
        status: 'Draft',
        listStatus: null,
        claimType: 'Billable',
        cashRetentionType: null,
        reference: null,
        claimAmount: null,
        retentionAmount: null,
        retentionPercentage: null,
        paidAmount: null,
        outstandingAmount: null,
        dueDate: null,
        sentDate: null,
        receivedDate: null,
        contractId: null,
        contractName: null,
        projectId: null,
        projectName: null,
        counterpartyId: null,
        counterpartyName: null,
      })),
    };
    const tool = new GetClaimSummaryTool(stub as any, makeConsumerStub());
    await tool.execute(
      { claimId: 12 },
      {
        userId: 1,
        companyId: 42,
        pageContext: { entity: 'project', entityId: '5' },
      },
    );
    expect(stub.getClaimForUser).toHaveBeenCalledWith(1, 12, 42);
  });
});

describe('GetContractSummaryTool', () => {
  it('uses the page-context contract id', async () => {
    const stub = {
      getContractForUser: jest.fn(async (userId, contractId, companyId) => ({
        contractId,
        companyId,
        contractName: 'X',
        contractStatus: 'In Progress',
        contractType: null,
        billingType: null,
        clientSupplierRole: null,
        retentionType: null,
        initialContractSum: null,
        paymentTerms: null,
        contractDate: null,
        startDate: null,
        defectLiabilityEndDate: null,
        projectId: null,
        projectName: null,
        counterpartyId: null,
        counterpartyName: null,
      })),
    };
    const tool = new GetContractSummaryTool(stub as any, makeConsumerStub());
    await tool.execute(
      {},
      {
        userId: 2,
        companyId: 8,
        pageContext: { entity: 'contract', entityId: 77 },
      },
    );
    expect(stub.getContractForUser).toHaveBeenCalledWith(2, 77, 8);
  });
});

describe('GetProjectSummaryTool', () => {
  it('refuses an invalid project id', async () => {
    const tool = new GetProjectSummaryTool(
      {} as RecordSummaryService,
      makeConsumerStub(),
    );
    await expect(
      tool.execute({ projectId: -1 }, { userId: 1 }),
    ).rejects.toBeInstanceOf(AiToolError);
  });

  it('uses the page-context project id when entity matches', async () => {
    const stub = {
      getProjectForUser: jest.fn(async (userId, projectId, companyId) => ({
        projectId,
        companyId,
        projectName: 'P',
        projectStatus: 'In Progress',
        projectRole: null,
        projectDate: null,
        description: null,
        siteAddress: null,
        retentionType: null,
        headContractSum: null,
        ptaEligibility: 'No',
        rtaEligibility: 'No',
        ptaCompliance: 'Ok',
        rtaCompliance: 'Ok',
      })),
    };
    const tool = new GetProjectSummaryTool(stub as any, makeConsumerStub());
    await tool.execute(
      { projectId: 1 },
      {
        userId: 3,
        companyId: 9,
        pageContext: { entity: 'project', entityId: '12' },
      },
    );
    expect(stub.getProjectForUser).toHaveBeenCalledWith(3, 12, 9);
  });
});
