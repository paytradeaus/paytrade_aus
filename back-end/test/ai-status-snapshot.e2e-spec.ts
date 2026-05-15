import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import * as request from 'supertest';

import { AiStatusSnapshotController } from '../src/api/users/ai-status-snapshot/ai-status-snapshot.controller';
import { AiStatusSnapshotService } from '../src/api/users/ai-status-snapshot/ai-status-snapshot.service';
import { jwtConstants } from '../src/api/auth/constants';

describe('AiStatusSnapshotController (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;

  const fakeSnapshot = {
    company_id: 42,
    generated_at: new Date().toISOString(),
    cached: false,
    summary: { total: 0, critical: 0, warning: 0, info: 0 },
    categories: [],
  };

  const snapshotServiceMock = {
    getSnapshot: jest.fn().mockResolvedValue(fakeSnapshot),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: jwtConstants.secret,
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [AiStatusSnapshotController],
      providers: [
        { provide: AiStatusSnapshotService, useValue: snapshotServiceMock },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    jwt = app.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  const sign = (payload: Record<string, unknown>) =>
    jwt.sign(payload, { secret: jwtConstants.secret });

  it('rejects requests without a bearer token (403)', async () => {
    await request(app.getHttpServer())
      .get('/api/ai/status-snapshot?company_id=42')
      .expect(403);
  });

  it('rejects requests with an invalid token (403)', async () => {
    await request(app.getHttpServer())
      .get('/api/ai/status-snapshot?company_id=42')
      .set('Authorization', 'Bearer not-a-real-jwt')
      .expect(403);
  });

  it('rejects when the JWT does not authorise the requested company (403)', async () => {
    const token = sign({
      userId: 1,
      isAdmin: false,
      companySpecificRoles: [{ companyId: 99, role: 'ADMIN' }],
    });
    await request(app.getHttpServer())
      .get('/api/ai/status-snapshot?company_id=42')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('rejects when the companyid header disagrees with the query param (403)', async () => {
    const token = sign({
      userId: 1,
      isAdmin: false,
      companySpecificRoles: [{ companyId: 42, role: 'ADMIN' }],
    });
    await request(app.getHttpServer())
      .get('/api/ai/status-snapshot?company_id=42')
      .set('Authorization', `Bearer ${token}`)
      .set('companyid', '99')
      .expect(403);
  });

  it('returns 400 when company_id query param is missing/invalid', async () => {
    const token = sign({
      userId: 1,
      isAdmin: true,
      companySpecificRoles: [],
    });
    await request(app.getHttpServer())
      .get('/api/ai/status-snapshot')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('returns the snapshot when JWT authorises the requested company', async () => {
    const token = sign({
      userId: 7,
      isAdmin: false,
      companySpecificRoles: [{ companyId: 42, role: 'PRIMARY ADMIN' }],
    });
    const res = await request(app.getHttpServer())
      .get('/api/ai/status-snapshot?company_id=42')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.status).toBe('SUCCESS');
    expect(res.body.data.company_id).toBe(42);
    expect(snapshotServiceMock.getSnapshot).toHaveBeenCalledWith(42, false);
  });

  it('passes force_refresh=true through to the service', async () => {
    const token = sign({
      userId: 7,
      isAdmin: true,
      companySpecificRoles: [],
    });
    snapshotServiceMock.getSnapshot.mockClear();
    await request(app.getHttpServer())
      .get('/api/ai/status-snapshot?company_id=42&force_refresh=true')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(snapshotServiceMock.getSnapshot).toHaveBeenCalledWith(42, true);
  });
});
