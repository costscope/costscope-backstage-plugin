const http = require('http');
const path = require('path');
const { URL } = require('url');

const cors = require('cors');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 7008;
const MOCK_TARGET = process.env.MOCK_TARGET || 'http://localhost:7007';
// Prefer explicit FRONTEND_ORIGIN, fall back to APP_PORT if provided, then default to 3000
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || (process.env.APP_PORT ? `http://localhost:${process.env.APP_PORT}` : 'http://localhost:3000');

// CORS handling: support FRONTEND_ORIGINS (CSV) or, in development, allow any localhost origins.
// This keeps production strict while allowing devcontainers where container:3000 -> host:3001.
const frontendOriginsEnv = process.env.FRONTEND_ORIGINS;
const allowedOrigins = frontendOriginsEnv ? frontendOriginsEnv.split(',').map(s => s.trim()).filter(Boolean) : null;

function isLocalhostOrigin(origin) {
  if (!origin) return false;
  try {
    const u = new URL(origin);
    return (u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1'));
  } catch (e) {
    return false;
  }
}

function originAllowed(origin) {
  if (!origin) return false;
  if (allowedOrigins) return allowedOrigins.includes(origin);
  // default: in development allow any localhost origin
  if (process.env.NODE_ENV === 'development') return isLocalhostOrigin(origin);
  // fallback to explicit FRONTEND_ORIGIN
  return origin === FRONTEND_ORIGIN;
}

// Custom CORS middleware: set explicit Access-Control-Allow-* headers when origin is allowed.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin) return next();
  const allowed = originAllowed(origin);
  if (!allowed) return next();

  // Gate credentials strictly to explicit whitelist (or explicit FRONTEND_ORIGIN),
  // not to dev localhost wildcard allowances.
  const isExplicitWhitelist = (allowedOrigins ? allowedOrigins.includes(origin) : origin === FRONTEND_ORIGIN);

  res.setHeader('Access-Control-Allow-Origin', origin);
  if (isExplicitWhitelist) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  return next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => res.json({ ok: true }));

// Simple catalog stub so the example Catalog link doesn't 500
app.get('/api/catalog/entities', (_req, res) => {
  res.json([]);
});

// Basic proxy for /api/costscope -> mock server
app.use('/api/costscope', (req, res) => {
  try {
    const targetBase = MOCK_TARGET; // e.g. http://localhost:7007
    // SSRF hardening: construct target URL from fixed base + normalized path/query only.
    const BASE_PREFIX = '/api/costscope';
    if (!req.originalUrl.startsWith(BASE_PREFIX)) {
      return res.status(400).json({ error: 'Invalid proxy path' });
    }

    const base = new URL(targetBase);
    const remainder = req.originalUrl.slice(BASE_PREFIX.length) || '/';
    const qIndex = remainder.indexOf('?');
    const pathOnly = qIndex >= 0 ? remainder.slice(0, qIndex) : remainder;
    const search = qIndex >= 0 ? remainder.slice(qIndex) : '';

    const joinedPath = path.posix.join(base.pathname || '/', pathOnly || '/');

    const targetUrl = new URL(base.toString());
    targetUrl.pathname = joinedPath;
    targetUrl.search = search;

    const options = {
      method: req.method,
      headers: Object.assign({}, req.headers, { host: targetUrl.host }),
    };

    const proxyReq = http.request(targetUrl, options, proxyRes => {
      res.statusCode = proxyRes.statusCode || 502;
      // copy headers except upstream CORS to keep proxy's CORS decision authoritative
      const headers = { ...(proxyRes.headers || {}) };
      delete headers['access-control-allow-origin'];
      delete headers['access-control-allow-credentials'];
      Object.entries(headers).forEach(([k, v]) => {
        try { res.setHeader(k, v); } catch (_err) { /* ignore */ }
      });
      proxyRes.pipe(res);
    });

    proxyReq.on('error', err => {
      res.status(502).json({ error: 'Bad gateway', message: err.message });
    });

    // pipe request body
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }
  } catch (err) {
    res.status(500).json({ error: 'Proxy error', message: String(err) });
  }
});

// Use the monorepo's canonical logger so runtime code adheres to the project's
// no-console policy. This path exists in `packages/plugin/src/utils/logger.ts`.
// If the import fails for any reason, provide a minimal noop-ish fallback.
let loggerModule;
try {
  loggerModule = require('../../plugin/src/utils/logger');
} catch (e) {
  loggerModule = null;
}

const logger = (loggerModule && (typeof loggerModule.info === 'function'))
  ? loggerModule
  : { info: () => {}, warn: () => {}, error: () => {} };

app.listen(PORT, () => {
  const msg = `Backend listening on ${PORT}, proxying costscope -> ${MOCK_TARGET}`;
  logger.info(msg);
});
