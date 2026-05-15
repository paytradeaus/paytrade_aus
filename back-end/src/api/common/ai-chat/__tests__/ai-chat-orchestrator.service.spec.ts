import { AiChatOrchestratorService, OrchestratorEvent } from '../services/ai-chat-orchestrator.service';
import { LlmStreamEvent } from '../llm/llm-provider.interface';

/**
 * Task #162 — Orchestrator unit test with a mocked LLM provider.
 *
 * Covers the happy path:
 *  - run_started → text_delta → tool_call → tool result → final text → run_completed
 *  - Billing.consumeCredit invoked with rawCostUsd + idempotency key
 *  - Prompt audit recorded
 *  - Run finalisation persists usage and amountChargedUsd
 */
describe('AiChatOrchestratorService', () => {
  function makeMocks() {
    const llm = {
      defaultModel: 'gpt-4o',
      isAvailable: () => true,
      chatStream: jest.fn(),
    };
    const registry = {
      list: jest.fn().mockReturnValue([
        {
          name: 'listClaimsWithIssues',
          description: 'List claims with issues',
          parametersJsonSchema: { type: 'object', properties: {} },
        },
      ]),
      execute: jest.fn().mockResolvedValue({ claims: [{ id: 1, problem: 'overdue' }] }),
    };
    const runs = {
      ensureConversation: jest.fn().mockResolvedValue({ id: 'conv-1' }),
      startRun: jest.fn().mockResolvedValue({ id: 'run-1' }),
      registerAbortController: jest.fn(),
      releaseAbortController: jest.fn(),
      finishRun: jest.fn().mockResolvedValue(undefined),
    };
    const events = { emit: jest.fn() };
    const billing = {
      getCostMultiplier: jest.fn().mockResolvedValue(2),
      consumeCredit: jest.fn().mockResolvedValue({
        ok: true,
        amountChargedUsd: 0.02,
        multiplier: 2,
        balanceAfterUsd: 9.98,
      }),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };

    const service = new AiChatOrchestratorService(
      llm as any,
      registry as any,
      runs as any,
      events as any,
      billing as any,
      audit as any,
    );

    return { service, llm, registry, runs, events, billing, audit };
  }

  function streamFromEvents(events: LlmStreamEvent[]): AsyncIterable<LlmStreamEvent> {
    return {
      [Symbol.asyncIterator]: async function* () {
        for (const e of events) yield e;
      },
    };
  }

  it('streams the full lifecycle and bills the run', async () => {
    const { service, llm, registry, runs, billing, audit } = makeMocks();

    // Hop 1: text + a tool call, then completed.
    // Hop 2: final text + completed.
    llm.chatStream
      .mockReturnValueOnce(
        streamFromEvents([
          { type: 'text_delta', text: 'Looking up your claims…' },
          { type: 'tool_call', id: 'call_1', name: 'listClaimsWithIssues', argumentsJson: '{}' },
          {
            type: 'usage',
            promptTokens: 100,
            completionTokens: 20,
            totalTokens: 120,
            rawCostUsd: 0.005,
            responseId: 'resp_1',
            model: 'gpt-4o',
          },
          { type: 'completed', finishReason: 'tool_calls' },
        ]),
      )
      .mockReturnValueOnce(
        streamFromEvents([
          { type: 'text_delta', text: 'You have 1 overdue claim.' },
          {
            type: 'usage',
            promptTokens: 60,
            completionTokens: 10,
            totalTokens: 70,
            rawCostUsd: 0.005,
            responseId: 'resp_1',
            model: 'gpt-4o',
          },
          { type: 'completed', finishReason: 'stop' },
        ]),
      );

    const collected: OrchestratorEvent[] = [];
    for await (const evt of service.run({
      userId: 7,
      companyId: 42,
      conversationId: null,
      userMessage: 'Anything wrong?',
      history: [],
    })) {
      collected.push(evt);
    }

    const types = collected.map((e) => e.type);
    expect(types[0]).toBe('run_started');
    expect(types).toContain('text_delta');
    expect(types).toContain('tool_call_started');
    expect(types).toContain('tool_call_completed');
    expect(types[types.length - 1]).toBe('run_completed');

    expect(registry.execute).toHaveBeenCalledWith(
      'listClaimsWithIssues',
      {},
      expect.objectContaining({ userId: 7, companyId: 42, aiRunId: 'run-1' }),
    );
    expect(billing.consumeCredit).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 42,
        rawCostUsd: 0.01,
        aiRunId: 'run-1',
        idempotencyKey: 'ai-run:run-1',
      }),
    );
    expect(audit.record).toHaveBeenCalled();
    expect(runs.finishRun).toHaveBeenCalledWith(
      'run-1',
      expect.objectContaining({
        status: 'completed',
        totalTokens: 190,
        toolCallCount: 1,
        amountChargedUsd: 0.02,
      }),
    );

    const completed = collected[collected.length - 1] as Extract<
      OrchestratorEvent,
      { type: 'run_completed' }
    >;
    expect(completed.status).toBe('completed');
    expect(completed.summary.amountChargedUsd).toBe(0.02);
    expect(completed.summary.multiplier).toBe(2);
    expect(completed.summary.totalTokens).toBe(190);
    expect(completed.summary.toolCallCount).toBe(1);
  });

  it('returns a friendly failure when the LLM is unavailable', async () => {
    const { service, llm } = makeMocks();
    llm.isAvailable = () => false;

    const events: OrchestratorEvent[] = [];
    for await (const e of service.run({
      userId: 1,
      companyId: 1,
      conversationId: null,
      userMessage: 'hi',
      history: [],
    })) {
      events.push(e);
    }
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('run_completed');
    expect((events[0] as any).status).toBe('failed');
  });
});
