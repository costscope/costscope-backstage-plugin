/** @jest-environment node */
import request from 'supertest';
import { createMockBackendApp } from '../../src/server';

describe('mock-backend CORS', () => {
  const ALLOWED = 'http://allowed.example';

  it('allows whitelisted origin without credentials', async () => {
    const { app } = createMockBackendApp({ frontendOrigin: ALLOWED });
    const res = await request(app).get('/health').set('Origin', ALLOWED);
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED);
    // Credentials are intentionally not enabled for security.
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('rejects non-whitelisted origin', async () => {
    const { app } = createMockBackendApp({ frontendOrigin: ALLOWED });
    const res = await request(app).get('/health').set('Origin', 'http://attacker.example');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('rejects null origin', async () => {
    const { app } = createMockBackendApp({ frontendOrigin: ALLOWED });
    const res = await request(app).get('/health').set('Origin', 'null');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('optionally allows localhost origin when explicitly enabled', async () => {
    const prev = process.env.FRONTEND_ALLOW_LOCALHOST;
    process.env.FRONTEND_ALLOW_LOCALHOST = 'true';
    try {
      const { app } = createMockBackendApp({ frontendOrigin: ALLOWED });
      const res = await request(app).get('/health').set('Origin', 'http://localhost:3001');
  expect(res.status).toBe(200);
  expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3001');
  // For localhost wildcard allowances, credentials are not enabled.
  expect(res.headers['access-control-allow-credentials']).toBeUndefined();
    } finally {
      if (prev === undefined) {
        delete process.env.FRONTEND_ALLOW_LOCALHOST;
      } else {
        process.env.FRONTEND_ALLOW_LOCALHOST = prev;
      }
    }
  });
});
