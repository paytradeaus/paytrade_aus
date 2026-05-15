import { AiToolRegistryService } from '../ai-tool-registry.service';
import { AiTool, AiToolError } from '../ai-tool.interface';
import { objectSchema } from '../simple-schema';

/**
 * Task #159 — Tests for the registry's execution + logging contract.
 *
 * The repositories are stubbed so the test runs without a database.
 * We assert that:
 *   - successful calls validate input, run, validate output, and log
 *     a `success` row;
 *   - bad input is rejected with `invalid_input` and still logged;
 *   - unknown tool names are rejected with `unknown_tool` and logged;
 *   - idempotency-key replay returns the previous output without
 *     re-executing the tool.
 */
function makeRepoStub<T extends Record<string, any> = any>() {
  const rows: T[] = [];
  return {
    rows,
    insert: jest.fn(async (row: T) => {
      rows.push(row);
      return { identifiers: [{ id: 'fake' }] } as any;
    }),
    update: jest.fn(async () => ({} as any)),
    findOne: jest.fn(async () => null),
  };
}

function buildSubject() {
  const registryRepo = makeRepoStub();
  const callRepo = makeRepoStub();
  const subject = new AiToolRegistryService(
    registryRepo as any,
    callRepo as any,
  );
  return { subject, registryRepo, callRepo };
}

const echoInput = objectSchema<{ value: string }>({
  value: { type: 'string' },
});
const echoOutput = objectSchema<{ value: string }>({
  value: { type: 'string' },
});

function makeEchoTool(): AiTool<{ value: string }, { value: string }> {
  return {
    name: 'echo',
    description: 'echoes its input',
    riskLevel: 'read',
    inputSchema: echoInput,
    outputSchema: echoOutput,
    execute: async (input) => ({ value: input.value }),
  };
}

describe('AiToolRegistryService', () => {
  it('registers tools and validates name format', async () => {
    const { subject } = buildSubject();
    await subject.register(makeEchoTool());
    expect(subject.get('echo')).toBeDefined();
    expect(subject.list()).toHaveLength(1);

    await expect(
      subject.register({ ...makeEchoTool(), name: 'bad name!' }),
    ).rejects.toThrow(/Invalid tool name/);
  });

  it('executes a successful call and logs it', async () => {
    const { subject, callRepo } = buildSubject();
    await subject.register(makeEchoTool());

    const out = await subject.execute(
      'echo',
      { value: 'hello' },
      { userId: 7, companyId: 42, aiRunId: 'run-1' },
    );

    expect(out).toEqual({ value: 'hello' });
    expect(callRepo.insert).toHaveBeenCalledTimes(1);
    const row = callRepo.rows[0];
    expect(row.tool_name).toBe('echo');
    expect(row.status).toBe('success');
    expect(row.user_id).toBe(7);
    expect(row.company_id).toBe(42);
    expect(row.ai_run_id).toBe('run-1');
    expect(typeof row.duration_ms).toBe('number');
  });

  it('rejects unknown tools with unknown_tool and logs the failure', async () => {
    const { subject, callRepo } = buildSubject();
    await expect(subject.execute('does-not-exist', {})).rejects.toBeInstanceOf(
      AiToolError,
    );
    expect(callRepo.rows[0]).toMatchObject({
      tool_name: 'does-not-exist',
      status: 'error',
      error_code: 'unknown_tool',
    });
  });

  it('rejects bad input with invalid_input and logs the failure', async () => {
    const { subject, callRepo } = buildSubject();
    await subject.register(makeEchoTool());

    await expect(
      subject.execute('echo', { value: 123 } as any),
    ).rejects.toBeInstanceOf(AiToolError);
    expect(callRepo.rows[0]).toMatchObject({
      tool_name: 'echo',
      status: 'error',
      error_code: 'invalid_input',
    });
  });

  it('replays previous output when idempotency-key matches and still logs the replay', async () => {
    const { subject, callRepo } = buildSubject();
    await subject.register(makeEchoTool());

    callRepo.findOne.mockResolvedValueOnce({
      id: 'prev-1',
      output: { value: 'cached' },
      status: 'success',
    } as any);

    const out = await subject.execute(
      'echo',
      { value: 'fresh' },
      { idempotencyKey: 'k1', userId: 7, companyId: 42 },
    );

    expect(out).toEqual({ value: 'cached' });
    // Replay must still produce an audit row.
    expect(callRepo.insert).toHaveBeenCalledTimes(1);
    expect(callRepo.rows[0]).toMatchObject({
      tool_name: 'echo',
      status: 'replay',
      replay_of_call_id: 'prev-1',
      idempotency_key: 'k1',
      user_id: 7,
      company_id: 42,
    });
  });

  it('scopes idempotency lookup by tool, user and company', async () => {
    const { subject, callRepo } = buildSubject();
    await subject.register(makeEchoTool());
    await subject.execute(
      'echo',
      { value: 'x' },
      { idempotencyKey: 'k1', userId: 7, companyId: 42 },
    );
    expect(callRepo.findOne).toHaveBeenCalledWith({
      where: {
        tool_name: 'echo',
        user_id: 7,
        company_id: 42,
        idempotency_key: 'k1',
        status: 'success',
      },
    });
  });

  it('refuses to run a disabled tool', async () => {
    const { subject, callRepo } = buildSubject();
    const disabled = { ...makeEchoTool(), enabled: false };
    await subject.register(disabled);

    await expect(
      subject.execute('echo', { value: 'x' }),
    ).rejects.toBeInstanceOf(AiToolError);
    expect(callRepo.rows[0]).toMatchObject({
      status: 'denied',
      error_code: 'tool_disabled',
    });
  });
});
