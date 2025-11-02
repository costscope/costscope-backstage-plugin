import http from 'http';
import path from 'path';
import { URL } from 'url';

import express, { Request, Response } from 'express';

export interface MockBackendOptions {
  target?: string; // upstream finops/costscope base (default http://localhost:7007)
  port?: number;   // preferred port (0 => random)
  frontendOrigin?: string;
}

export function createMockBackendApp(opts?: MockBackendOptions) {
  const app = express();
  const envFrontendOrigin = process.env.FRONTEND_ORIGIN;
  const envFrontendOrigins = process.env.FRONTEND_ORIGINS;
  const FRONTEND_ORIGIN = opts?.frontendOrigin || envFrontendOrigin || 'http://localhost:3000';
  const TARGET = opts?.target || process.env.MOCK_TARGET || 'http://localhost:7007';

  // Build allowed origins whitelist map (preserve backwards compat with FRONTEND_ORIGIN)
  // CodeQL recognizes object-map whitelists; prefer this over Set for static analysis.
  const whitelist: Record<string, true> = {};
  if (envFrontendOrigins) {
    envFrontendOrigins
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(o => { whitelist[o] = true; });
  }
  if (FRONTEND_ORIGIN) { whitelist[FRONTEND_ORIGIN] = true; }

  const isLocalhostOrigin = (origin: string) => {
    try {
      const u = new URL(origin);
      return (u.hostname === 'localhost' || u.hostname === '127.0.0.1') && !!u.port;
    } catch {
      return false;
    }
  };

  // Custom CORS middleware: echo request Origin only when allowed (strict whitelist).
  // Optional localhost:<port> allowance can be enabled via FRONTEND_ALLOW_LOCALHOST=true.
  // When allowing localhost wildcard, we DO NOT enable credentials to avoid broadening risk.
  app.use((req, res, next) => {
    const origin = req.headers.origin as string | undefined;
    if (!origin) return next();

    // Never allow the special "null" origin when credentials may be involved.
    if (origin === 'null') return next();

    const allowLocalhostWildcard = process.env.FRONTEND_ALLOW_LOCALHOST === 'true';
    const isWhitelisted = !!whitelist[origin];
    const isLocalhostAllowed = allowLocalhostWildcard && isLocalhostOrigin(origin);

    if (isWhitelisted || isLocalhostAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      // Only send credentials for explicit whitelist matches; not for wildcard localhost allowances.
      if (isWhitelisted) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
      res.setHeader('Vary', 'Origin');
    }

    if (req.method === 'OPTIONS') {
      // Preflight
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      // Reflect requested headers if present to avoid over-broad wildcard with credentials
      if (typeof req.headers['access-control-request-headers'] === 'string') {
        res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers']);
      }
      return res.status(204).end();
    }

    return next();
  });
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));
  app.get('/api/catalog/entities', (_req: Request, res: Response) => { res.json([]); });

  app.use('/api/costscope', (req: Request, res: Response): void => {
    try {
      // SSRF hardening: never let user-controlled path influence the target hostname/protocol.
      // Build the outgoing URL from a fixed base (TARGET) and only append the path + query
      // portion following the '/api/costscope' prefix. Reject if prefix is missing.
      const BASE_PREFIX = '/api/costscope';
      const base = new URL(TARGET);

      if (!req.originalUrl.startsWith(BASE_PREFIX)) {
        res.status(400).json({ error: 'Invalid proxy path' });
        return;
      }

      const remainder = req.originalUrl.slice(BASE_PREFIX.length) || '/';
      const qIndex = remainder.indexOf('?');
      const pathOnly = qIndex >= 0 ? remainder.slice(0, qIndex) : remainder;
      const search = qIndex >= 0 ? remainder.slice(qIndex) : '';

      // Normalize and join URL paths using posix semantics to avoid backslashes on Windows
      const joinedPath = path.posix.join(base.pathname || '/', pathOnly || '/');

      const targetUrl = new URL(base.toString());
      targetUrl.pathname = joinedPath;
      targetUrl.search = search;
  const options: http.RequestOptions = { method: req.method, headers: { ...req.headers, host: targetUrl.host } };
      const proxyReq = http.request(targetUrl, options, proxyRes => {
        res.statusCode = proxyRes.statusCode || 502;
        // Avoid copying upstream CORS headers so that the proxy's CORS decision (above)
        // is authoritative for the browser-facing response.
        const headers = { ...(proxyRes.headers || {}) } as Record<string, any>;
        delete headers['access-control-allow-origin'];
        delete headers['access-control-allow-credentials'];
        Object.entries(headers).forEach(([k, v]) => { if (v !== undefined) { try { res.setHeader(k, v as any); } catch { /* ignore */ } } });
        proxyRes.pipe(res);
      });
      proxyReq.on('error', err => { res.status(502).json({ error: 'Bad gateway', message: err.message }); });
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) { req.pipe(proxyReq); } else { proxyReq.end(); }
    } catch (err) {
      res.status(500).json({ error: 'Proxy error', message: String(err) });
      return;
    }
  });

  return { app, target: TARGET };
}

export async function startMockBackend(opts?: MockBackendOptions) {
  const { app, target } = createMockBackendApp(opts);
  const port = opts?.port ?? (process.env.PORT ? Number(process.env.PORT) : 0);
  return await new Promise<{ server: http.Server, port: number, target: string }>((resolve) => {
    const server = app.listen(port, () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      process.stdout.write(`mock-backend (test) listening on ${actualPort} -> proxy /api/costscope => ${target}\n`);
      resolve({ server, port: actualPort, target });
    });
  });
}
