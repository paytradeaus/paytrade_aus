import { RequestUserViewNavigationTool } from '../tools/request-user-view-navigation.tool';
import { AiToolError } from '../../ai-tools/ai-tool.interface';

/**
 * Task #202 — verifies the server-side gate on `ai_live_follow_enabled`.
 *
 * The frontend has its own toggle (defence in depth), but the model
 * must not be able to drive navigation when the user has opted out
 * server-side. We also assert that the tool refuses unauthenticated
 * calls and bad routes regardless of the flag.
 */
describe('RequestUserViewNavigationTool', () => {
  function makeTool(userRow: { ai_live_follow_enabled?: boolean } | null) {
    const events = { emit: jest.fn() };
    const userRepo = {
      findOne: jest.fn().mockResolvedValue(userRow),
    };
    const tool = new RequestUserViewNavigationTool(
      events as any,
      userRepo as any,
    );
    return { tool, events, userRepo };
  }

  it('refuses when ai_live_follow_enabled is false (does not emit)', async () => {
    const { tool, events } = makeTool({ ai_live_follow_enabled: false });

    const result = await tool.execute(
      { route: '/user/payment-claims/1', reason: 'Open the claim' },
      { userId: 7, aiRunId: 'run-x' },
    );

    expect(result).toEqual({
      delivered: false,
      route: '/user/payment-claims/1',
      reasonRecorded: 'Open the claim',
      followEnabled: false,
    });
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('refuses when the user row is missing entirely', async () => {
    const { tool, events } = makeTool(null);

    const result = await tool.execute(
      { route: '/dashboard' },
      { userId: 7, aiRunId: 'run-x' },
    );

    expect(result.delivered).toBe(false);
    expect(result.followEnabled).toBe(false);
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('emits a navigation_request when the flag is on', async () => {
    const { tool, events } = makeTool({ ai_live_follow_enabled: true });

    const result = await tool.execute(
      { route: '/user/payment-claims/42', reason: 'Open claim 42' },
      { userId: 9, aiRunId: 'run-y' },
    );

    expect(result.delivered).toBe(true);
    expect(result.followEnabled).toBe(true);
    expect(events.emit).toHaveBeenCalledTimes(1);
    const [userId, evt] = events.emit.mock.calls[0];
    expect(userId).toBe(9);
    expect(evt.type).toBe('navigation_request');
    expect(evt.route).toBe('/user/payment-claims/42');
    expect(evt.runId).toBe('run-y');
    expect(evt.reason).toBe('Open claim 42');
  });

  it('throws permission_denied without a userId in context', async () => {
    const { tool } = makeTool({ ai_live_follow_enabled: true });
    await expect(
      tool.execute({ route: '/dashboard' }, {}),
    ).rejects.toBeInstanceOf(AiToolError);
  });

  it('rejects routes that are not relative paths', async () => {
    const { tool, events } = makeTool({ ai_live_follow_enabled: true });

    await expect(
      tool.execute(
        { route: 'https://evil.example.com/steal' },
        { userId: 1, aiRunId: 'r' },
      ),
    ).rejects.toBeInstanceOf(AiToolError);
    expect(events.emit).not.toHaveBeenCalled();
  });
});
