import http from 'http';
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

  // Build allowed origins list (preserve backwards compat with FRONTEND_ORIGIN)
  const allowedOrigins = new Set<string>();
  if (envFrontendOrigins) {
    envFrontendOrigins.split(',').map(s => s.trim()).filter(Boolean).forEach(o => allowedOrigins.add(o));
  }
  if (FRONTEND_ORIGIN) allowedOrigins.add(FRONTEND_ORIGIN);

  const isLocalhostOrigin = (origin: string) => {
    try {
      const u = new URL(origin);
      return (u.hostname === 'localhost' || u.hostname === '127.0.0.1') && !!u.port;
    } catch {
      return false;
    }
  };

  // Custom CORS middleware: echo request Origin when allowed, support multiple origins and
  // allow localhost:port wildcard during development.
  app.use((req, res, next) => {
    const origin = req.headers.origin as string | undefined;
    if (!origin) return next();

    // If origin exactly matches an allowed origin, echo it back.
    if (allowedOrigins.has(origin) || allowedOrigins.size === 0) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
    } else if (isLocalhostOrigin(origin)) {
      // Allow any localhost:<port> origin in development to make devcontainer/host mapping smoother.
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
    }

    if (req.method === 'OPTIONS') {
      // Preflight
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || '*');
      return res.status(204).end();
    }

    return next();
  });
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));
  app.get('/api/catalog/entities', (_req: Request, res: Response) => { res.json([]); });

  app.use('/api/costscope', (req: Request, res: Response) => {
    try {
      const targetUrl = new URL(req.originalUrl, TARGET);
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
