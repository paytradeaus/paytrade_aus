import { GetCurrentPageContextTool } from '../tools/get-current-page-context.tool';
import { GetSystemStatusSnapshotTool } from '../tools/get-system-status-snapshot.tool';
import { GetBusinessProfileSummaryTool } from '../tools/get-business-profile-summary.tool';
import { PageContextService } from '../services/page-context.service';
import { SystemStatusService } from '../services/system-status.service';
import { BusinessProfileService } from '../services/business-profile.service';
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
 * Task #159 — Sanity-check the three example tools to lock the
 * "wrap a real domain service, never query the DB directly" rule
 * and the "server-side context wins" rule.
 */
describe('GetCurrentPageContextTool', () => {
  it('returns a normalised page context and coerces numeric entityId to string', async () => {
    const consumer = makeConsumerStub();
    const tool = new GetCurrentPageContextTool(
      new PageContextService(),
      consumer,
    );
    const out = await tool.execute(
      {},
      {
        userId: 1,
        companyId: 42,
        aiRunId: 'run-1',
        pageContext: { path: '/projects/9', entity: 'project', entityId: 9 },
      },
    );
    expect(out).toMatchObject({
      path: '/projects/9',
      entity: 'project',
      entityId: '9',
    });
    expect(typeof out.resolvedAt).toBe('string');
    expect(consumer.consumeOrTopup).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 42,
        rawCostUsd: 0,
        aiRunId: 'run-1',
      }),
    );
  });

  it('returns nulls when no page context is supplied', async () => {
    const consumer = makeConsumerStub();
    const tool = new GetCurrentPageContextTool(
      new PageContextService(),
      consumer,
    );
    const out = await tool.execute({}, { userId: 1 });
    expect(out.path).toBeNull();
    expect(out.entity).toBeNull();
    expect(out.entityId).toBeNull();
    // No companyId in context → no charge attempt.
    expect(consumer.consumeOrTopup).not.toHaveBeenCalled();
  });
});

describe('GetSystemStatusSnapshotTool', () => {
  it('refuses to run without an authenticated user', async () => {
    const tool = new GetSystemStatusSnapshotTool(
      {} as SystemStatusService,
      makeConsumerStub(),
    );
    await expect(tool.execute({}, {})).rejects.toBeInstanceOf(AiToolError);
  });

  it('passes the server-side companyId in preference to the model-supplied one and charges credits', async () => {
    const stub = {
      getSnapshotForUser: jest.fn(async (userId, companyId) => ({
        generatedAt: 'now',
        scope: { userId, companyId },
        company: null,
        membership: { role: null, isOwner: false },
      })),
    };
    const consumer = makeConsumerStub();
    const tool = new GetSystemStatusSnapshotTool(stub as any, consumer);
    await tool.execute(
      { companyId: 999 },
      { userId: 1, companyId: 42, aiRunId: 'run-x', idempotencyKey: 'k' },
    );
    expect(stub.getSnapshotForUser).toHaveBeenCalledWith(1, 42);
    expect(consumer.consumeOrTopup).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 42,
        rawCostUsd: 0,
        aiRunId: 'run-x',
        toolCallId: 'k',
        idempotencyKey: 'run-x:getSystemStatusSnapshot:k',
      }),
    );
  });
});

describe('GetBusinessProfileSummaryTool', () => {
  it('refuses to run without an authenticated user', async () => {
    const tool = new GetBusinessProfileSummaryTool(
      {} as BusinessProfileService,
      makeConsumerStub(),
    );
    await expect(tool.execute({}, {})).rejects.toBeInstanceOf(AiToolError);
  });

  it('refuses to run without a companyId in either context or input', async () => {
    const tool = new GetBusinessProfileSummaryTool(
      {} as BusinessProfileService,
      makeConsumerStub(),
    );
    await expect(tool.execute({}, { userId: 1 })).rejects.toBeInstanceOf(
      AiToolError,
    );
  });

  it('prefers the server-side companyId from the context and charges credits', async () => {
    const stub = {
      getSummaryForUser: jest.fn(async (userId, companyId) => ({
        companyId,
        companyName: 'Acme',
        legalName: null,
        entityType: 'Business',
        email: 'a@b.c',
        phone: '+0',
        address: '1 St',
      })),
    };
    const consumer = makeConsumerStub();
    const tool = new GetBusinessProfileSummaryTool(stub as any, consumer);
    await tool.execute({ companyId: 999 }, { userId: 1, companyId: 42 });
    expect(stub.getSummaryForUser).toHaveBeenCalledWith(1, 42);
    expect(consumer.consumeOrTopup).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 42, rawCostUsd: 0 }),
    );
  });
});
