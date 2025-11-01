// Polyfill TextEncoder/TextDecoder for the test environment before loading libraries
// that expect Web-like globals (some dependencies use @noble/hashes which references TextEncoder).
import { TextEncoder, TextDecoder } from 'util';
if (typeof (global as any).TextEncoder === 'undefined') {
  (global as any).TextEncoder = TextEncoder;
}
if (typeof (global as any).TextDecoder === 'undefined') {
  (global as any).TextDecoder = TextDecoder;
}

import request from 'supertest';
import { createServer } from 'http';

// Import the modular server factory so tests can create an app instance without
// starting the CLI entrypoint which binds fixed ports. This uses the exported
// createMockBackendApp from src/server.ts.
const { createMockBackendApp } = require('../src/server');
const { app: maybeApp } = createMockBackendApp({ frontendOrigin: 'http://localhost:3001' });

describe('mock-backend CORS (dev)', () => {
  let server: any;
  beforeAll(async () => {
    process.env.NODE_ENV = 'development';
    // The CJS entry starts a server when required; if it exported nothing, create a small shim.
    // To make tests robust, create a fresh express instance by requiring the source file
    // that sets up app if present. If index.js returned nothing, fall back to starting the
    // script in a child process is out of scope — so we assume index.js exports an app-like object.
    // In practice our index.js attaches listeners; for test we will require the express app if available.
  server = createServer(maybeApp).listen(0);
    await new Promise<void>(resolve => server.once('listening', () => resolve()));
  });

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  test('OPTIONS preflight allows http://localhost:3001', async () => {
    const res = await request(server)
      .options('/api/costscope')
      .set('Origin', 'http://localhost:3001')
      .set('Access-Control-Request-Method', 'GET');

    expect([204, 200]).toContain(res.status);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3001');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  test('GET returns Access-Control-Allow-Origin for localhost origin', async () => {
    // Use a local, non-proxied endpoint so the response headers are set by
    // the app's CORS middleware and not overridden by an upstream proxy.
    const res = await request(server)
      .get('/health')
      .set('Origin', 'http://localhost:3001');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3001');
  });
});
