import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import * as request from 'supertest';

import { AiChatController } from '../src/api/common/ai-chat/ai-chat.controller';
import { AiChatOrchestratorService } from '../src/api/common/ai-chat/services/ai-chat-orchestrator.service';
import { AiChatRunsService } from '../src/api/common/ai-chat/services/ai-chat-runs.service';
import { AiChatEventsService } from '../src/api/common/ai-chat/services/ai-chat-events.service';
import { jwtConstants } from '../src/api/auth/constants';

/**
 * Task #202 — supertest coverage for the chat SSE controller.
 *
 *  - 401/403 paths on `POST /api/ai/chat`, `POST /api/ai/runs/:id/stop`,
 *    and `GET /api/ai/events`.
 *  - Cross-company access denial via `assertCompanyAccess`.
 *  - SSE framing on the chat endpoint (event-stream content-type +
 *    `event:` / `data:` lines for each orchestrator event).
 *  - Stop endpoint returns 404 for unknown runs and 200 + abort for
 *    a run owned by the caller.
 */
describe('AiChatController (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;

  const orchestratorMock = {
    run: jest.fn(),
  };
  const runsMock = {
    findRunForUser: jest.fn(),
    abort: jest.fn(),
  };
  const eventsMock = {
    subscribe: jest.fn(),
    emit: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: jwtConstants.secret,
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [AiChatController],
      providers: [
        { provide: AiChatOrchestratorService, useValue: orchestratorMock },
        { provide: AiChatRunsService, useValue: runsMock },
        { provide: AiChatEventsService, useValue: eventsMock },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    jwt = app.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    orchestratorMock.run.mockReset();
    runsMock.findRunForUser.mockReset();
    runsMock.abort.mockReset();
    eventsMock.subscribe.mockReset();
    eventsMock.emit.mockReset();
  });

  const sign = (payload: Record<string, unknown>) =>
    jwt.sign(payload, { secret: jwtConstants.secret });

  // ---------------------------------------------------------------
  // POST /api/ai/chat
  // ---------------------------------------------------------------

  describe('POST /api/ai/chat', () => {
    it('rejects requests without a bearer token (403)', async () => {
      await request(app.getHttpServer())
        .post('/api/ai/chat')
        .send({ message: 'hi', companyId: 1 })
        .expect(403);
      expect(orchestratorMock.run).not.toHaveBeenCalled();
    });

    it('rejects requests with an invalid token (403)', async () => {
      await request(app.getHttpServer())
        .post('/api/ai/chat')
        .set('Authorization', 'Bearer not-a-real-jwt')
        .send({ message: 'hi', companyId: 1 })
        .expect(403);
      expect(orchestratorMock.run).not.toHaveBeenCalled();
    });

    it('rejects when the JWT does not authorise the requested company (403)', async () => {
      const token = sign({
        userId: 1,
        isAdmin: false,
        companySpecificRoles: [{ companyId: 99, role: 'ADMIN' }],
      });
      await request(app.getHttpServer())
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'hi', companyId: 42 })
        .expect(403);
      expect(orchestratorMock.run).not.toHaveBeenCalled();
    });

    it('returns 400 when message is missing', async () => {
      const token = sign({
        userId: 1,
        isAdmin: true,
        companySpecificRoles: [],
      });
      await request(app.getHttpServer())
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: '   ', companyId: 42 })
        .expect(400);
    });

    it('returns 400 when message exceeds the 4000-char cap', async () => {
      const token = sign({
        userId: 1,
        isAdmin: true,
        companySpecificRoles: [],
      });
      await request(app.getHttpServer())
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'a'.repeat(4001), companyId: 42 })
        .expect(400);
    });

    it('returns 400 when companyId is missing', async () => {
      const token = sign({
        userId: 1,
        isAdmin: true,
        companySpecificRoles: [],
      });
      await request(app.getHttpServer())
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'hi' })
        .expect(400);
    });

    it('streams orchestrator events as SSE frames', async () => {
      orchestratorMock.run.mockImplementation(async function* () {
        yield { type: 'run_started', runId: 'run-1', conversationId: 'c-1' };
        yield { type: 'text_delta', text: 'Hello!' };
        yield {
          type: 'run_completed',
          runId: 'run-1',
          status: 'completed',
          summary: {
            amountChargedUsd: 0.01,
            multiplier: 1,
            rawCostUsd: 0.005,
            totalTokens: 100,
            toolCallCount: 0,
            durationMs: 50,
            model: 'gpt-4o',
          },
        };
      });

      const token = sign({
        userId: 7,
        isAdmin: false,
        companySpecificRoles: [{ companyId: 42, role: 'PRIMARY ADMIN' }],
      });

      const res = await request(app.getHttpServer())
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'hello', companyId: 42 })
        .expect(201);

      expect(res.headers['content-type']).toMatch(/text\/event-stream/);
      expect(res.headers['cache-control']).toMatch(/no-cache/);

      const body = res.text;
      expect(body).toContain('event: run_started');
      expect(body).toContain('"runId":"run-1"');
      expect(body).toContain('event: text_delta');
      expect(body).toContain('"text":"Hello!"');
      expect(body).toContain('event: run_completed');
      expect(body).toContain('"status":"completed"');

      // Each event must be `event: <name>\ndata: <json>\n\n`.
      const frames = body.split('\n\n').filter((f) => f.trim().length > 0);
      for (const frame of frames) {
        expect(frame).toMatch(/^event: \S+\ndata: \{/);
      }

      expect(orchestratorMock.run).toHaveBeenCalledTimes(1);
      const callArg = orchestratorMock.run.mock.calls[0][0];
      expect(callArg.userId).toBe(7);
      expect(callArg.companyId).toBe(42);
      expect(callArg.userMessage).toBe('hello');
    });

    it('emits a synthetic failed run_completed when the orchestrator throws', async () => {
      orchestratorMock.run.mockImplementation(async function* () {
        // Yield nothing then throw.
        if (false) yield;
        throw new Error('boom');
      });

      const token = sign({
        userId: 7,
        isAdmin: true,
        companySpecificRoles: [],
      });

      const res = await request(app.getHttpServer())
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'hello', companyId: 42 })
        .expect(201);

      expect(res.text).toContain('event: run_completed');
      expect(res.text).toContain('"status":"failed"');
      expect(res.text).toContain('"errorMessage":"boom"');
    });
  });

  // ---------------------------------------------------------------
  // POST /api/ai/runs/:runId/stop
  // ---------------------------------------------------------------

  describe('POST /api/ai/runs/:runId/stop', () => {
    it('rejects unauthenticated callers (403)', async () => {
      await request(app.getHttpServer())
        .post('/api/ai/runs/run-1/stop')
        .expect(403);
      expect(runsMock.findRunForUser).not.toHaveBeenCalled();
    });

    it('returns 404 when the run is unknown to the caller', async () => {
      runsMock.findRunForUser.mockResolvedValue(null);
      const token = sign({ userId: 7, isAdmin: false, companySpecificRoles: [] });
      await request(app.getHttpServer())
        .post('/api/ai/runs/run-missing/stop')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(runsMock.findRunForUser).toHaveBeenCalledWith('run-missing', 7);
      expect(runsMock.abort).not.toHaveBeenCalled();
    });

    it('aborts the run and returns the result when found', async () => {
      runsMock.findRunForUser.mockResolvedValue({ id: 'run-1' });
      runsMock.abort.mockReturnValue(true);
      const token = sign({ userId: 7, isAdmin: false, companySpecificRoles: [] });
      const res = await request(app.getHttpServer())
        .post('/api/ai/runs/run-1/stop')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body).toEqual({
        status: 'SUCCESS',
        stopped: true,
        runId: 'run-1',
      });
      expect(runsMock.abort).toHaveBeenCalledWith('run-1');
    });
  });

  // ---------------------------------------------------------------
  // GET /api/ai/events
  // ---------------------------------------------------------------

  describe('GET /api/ai/events', () => {
    it('rejects requests with no token (403)', async () => {
      await request(app.getHttpServer())
        .get('/api/ai/events')
        .expect(403);
      expect(eventsMock.subscribe).not.toHaveBeenCalled();
    });

    it('rejects requests with an invalid ?token= (403)', async () => {
      await request(app.getHttpServer())
        .get('/api/ai/events?token=not-a-real-jwt')
        .expect(403);
      expect(eventsMock.subscribe).not.toHaveBeenCalled();
    });

    it('opens an SSE stream and subscribes the user when ?token= is valid', async () => {
      let sseListener: ((evt: any) => void) | null = null;
      const unsubscribe = jest.fn();
      eventsMock.subscribe.mockImplementation((userId: number, listener: any) => {
        sseListener = listener;
        return unsubscribe;
      });

      const token = sign({ userId: 11, isAdmin: true, companySpecificRoles: [] });

      // We can't keep an SSE connection open with supertest in a clean way,
      // so we open the request, wait for the initial frame, then abort.
      const req = request(app.getHttpServer())
        .get(`/api/ai/events?token=${token}`)
        .buffer(true)
        .parse((res, cb) => {
          let data = '';
          res.on('data', (chunk: Buffer) => {
            data += chunk.toString('utf8');
            if (data.includes('event: hello')) {
              // Push a fake event through the captured listener,
              // then end the response so the test can complete.
              sseListener?.({
                type: 'navigation_request',
                runId: 'run-1',
                route: '/dashboard',
                requestedAt: new Date().toISOString(),
              });
              setImmediate(() => (res as any).destroy());
            }
          });
          res.on('close', () => cb(null, data));
          res.on('end', () => cb(null, data));
        });

      const res: any = await req.catch((err) => err.response ?? { text: '' });
      const text = (res && (res.body || res.text)) || '';

      expect(eventsMock.subscribe).toHaveBeenCalledTimes(1);
      expect(eventsMock.subscribe.mock.calls[0][0]).toBe(11);
      expect(typeof text === 'string' ? text : '').toContain('event: hello');
    });
  });
});
