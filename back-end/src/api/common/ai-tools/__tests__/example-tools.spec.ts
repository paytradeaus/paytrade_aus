import { GetCurrentPageContextTool } from '../tools/get-current-page-context.tool';
import { GetSystemStatusSnapshotTool } from '../tools/get-system-status-snapshot.tool';
import { GetBusinessProfileSummaryTool } from '../tools/get-business-profile-summary.tool';
import { PageContextService } from '../services/page-context.service';
import { SystemStatusService } from '../services/system-status.service';
import { BusinessProfileService } from '../services/business-profile.service';
import { AiToolError } from '../ai-tool.interface';

/**
 * Task #159 — Sanity-check the three example tools to lock the
 * "wrap a real domain service, never query the DB directly" rule
 * and the "server-side context wins" rule.
 */
describe('GetCurrentPageContextTool', () => {
  it('returns a normalised page context and coerces numeric entityId to string', async () => {
    const tool = new GetCurrentPageContextTool(new PageContextService());
    const out = await tool.execute(
      {},
      { userId: 1, pageContext: { path: '/projects/9', entity: 'project', entityId: 9 } },
    );
    expect(out).toMatchObject({
      path: '/projects/9',
      entity: 'project',
      entityId: '9',
    });
    expect(typeof out.resolvedAt).toBe('string');
  });

  it('returns nulls when no page context is supplied', async () => {
    const tool = new GetCurrentPageContextTool(new PageContextService());
    const out = await tool.execute({}, { userId: 1 });
    expect(out.path).toBeNull();
    expect(out.entity).toBeNull();
    expect(out.entityId).toBeNull();
  });
});

describe('GetSystemStatusSnapshotTool', () => {
  it('refuses to run without an authenticated user', async () => {
    const tool = new GetSystemStatusSnapshotTool({} as SystemStatusService);
    await expect(tool.execute({}, {})).rejects.toBeInstanceOf(AiToolError);
  });

  it('passes the server-side companyId in preference to the model-supplied one', async () => {
    const stub = {
      getSnapshotForUser: jest.fn(async (userId, companyId) => ({
        generatedAt: 'now',
        scope: { userId, companyId },
        company: null,
        membership: { role: null, isOwner: false },
      })),
    };
    const tool = new GetSystemStatusSnapshotTool(stub as any);
    await tool.execute(
      { companyId: 999 },
      { userId: 1, companyId: 42 },
    );
    expect(stub.getSnapshotForUser).toHaveBeenCalledWith(1, 42);
  });
});

describe('GetBusinessProfileSummaryTool', () => {
  it('refuses to run without an authenticated user', async () => {
    const tool = new GetBusinessProfileSummaryTool(
      {} as BusinessProfileService,
    );
    await expect(tool.execute({}, {})).rejects.toBeInstanceOf(AiToolError);
  });

  it('refuses to run without a companyId in either context or input', async () => {
    const tool = new GetBusinessProfileSummaryTool(
      {} as BusinessProfileService,
    );
    await expect(tool.execute({}, { userId: 1 })).rejects.toBeInstanceOf(
      AiToolError,
    );
  });

  it('prefers the server-side companyId from the context', async () => {
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
    const tool = new GetBusinessProfileSummaryTool(stub as any);
    await tool.execute({ companyId: 999 }, { userId: 1, companyId: 42 });
    expect(stub.getSummaryForUser).toHaveBeenCalledWith(1, 42);
  });
});
