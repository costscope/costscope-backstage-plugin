/* Runner executed in a separate Node process with ts-node registered.
   It imports the TypeScript client directly and performs HTTP calls against
   an in-process Express fixture. Exit code 0 on success, non-zero on failure.
*/
import http from 'http';

import express from 'express';
import fetch from 'node-fetch';

import { CostscopeClient } from '../../client/index';

async function startUpstream() {
  const app = express();

  app.get('/api/costscope/providers', (_req, res) => {
    res.json([{ id: 'aws', name: 'AWS' }]);
  });

  app.get('/api/costscope/costs/daily', (_req, res) => {
    res.json({ data: [], meta: {} });
  });

  app.get('/api/costscope/costs/summary', (_req, res) => {
    res.json({ total: 0, breakdown: [] });
  });

  app.get('/api/costscope/healthz', (_req, res) => res.send('ok'));

  return new Promise<{ server: http.Server; port: number; baseUrl: string }>((resolve, reject) => {
    const server = app.listen(0, () => {
      // @ts-ignore - address() is string | AddressInfo
      const addr: any = server.address();
      const port = addr && addr.port ? addr.port : 0;
      resolve({ server, port, baseUrl: `http://127.0.0.1:${port}` });
    });
    server.on('error', reject);
  });
}

async function run() {
  const { server, baseUrl } = await startUpstream();

  try {
    const client = new CostscopeClient({
      discoveryApi: { getBaseUrl: async () => baseUrl + '/api/costscope' },
      fetchApi: { fetch: fetch as any },
      identityApi: { getCredentials: async () => ({ token: '' }) },
      enableInternalCache: true,
      telemetry: () => {},
    });

    const providers = await client.getProviders({ validate: false });
    if (!Array.isArray(providers) || providers.length === 0) {
      console.error('providers missing or empty', providers);
      process.exit(2);
    }

  const overview = await client.getOverview('P30D', { validate: false });
  const summary = await client.getSummary('P30D', { validate: false });

    // basic validation
    if (!overview || typeof overview !== 'object') {
      console.error('overview invalid', overview);
      process.exit(3);
    }
    if (!summary || typeof summary !== 'object') {
      console.error('summary invalid', summary);
      process.exit(4);
    }

    // indicate success
    // console.log(JSON.stringify({ providers, overview, summary }));
    process.exit(0);
  } catch (e) {
    // log and fail
    console.error('runner failed', e instanceof Error ? e.stack || e.message : e);
    process.exit(5);
  } finally {
    try {
      server.close();
    } catch (_) {
      // ignore
    }
  }
}

run();
