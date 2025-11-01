# Backstage SSR integration example (Costscope Progressive Hydration)

This example shows how to embed a Costscope SSR Prefetch Manifest into the rendered HTML and hydrate it on the client side for progressive hydration.

> Note: This repository doesn’t ship a server runtime; the snippet below targets a typical Backstage app backend with SSR enabled.

## Server-side (Node, in your Backstage app-backend)

```ts
// packages/backend/src/plugins/app.ts (example skeleton)
import { Router } from 'express';
import { renderByUrl } from '@backstage/plugin-app-backend/renderer';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { CostscopeClient, resolveServiceId, DEFAULT_PERIOD } from '@costscope/backstage-plugin';

export async function createAppRouter(/* deps */): Promise<Router> {
  const router = Router();

  // ... your discoveryApi, fetchApi, identityApi, errorApi instances here ...

  router.use(async (req, res, next) => {
    // Only prefetch for /costs (tune to your routes)
    if (!req.url.startsWith('/costs')) return next();

    const serviceId = resolveServiceId(/* configApi */ undefined);
    const client = new CostscopeClient({
      discoveryApi: /* discoveryApi */ undefined,
      fetchApi: /* fetchApi */ undefined,
      identityApi: /* identityApi */ undefined,
      errorApi: /* errorApi */ undefined,
      alertApi: /* alertApi */ undefined,
      serviceId,
      enableInternalCache: false,
      silent: true,
    });

    const period = DEFAULT_PERIOD;
    const project = undefined; // derive from entity annotation if known at SSR
    const overview = await client.getOverview(period, { project });

    const manifest = {
      version: 1 as const,
      ts: Date.now(),
      correlationId: crypto.randomUUID(),
      serviceId,
      params: { period, project },
      queries: [
        {
          key: ['costscope', 'overview', period, project || ''],
          endpoint: '/costs/daily',
          priority: 0,
          data: overview,
        },
      ],
    };

    (res as any).locals = (res as any).locals || {};
    (res as any).locals.costscopeManifest = manifest;
    next();
  });

  // Render HTML and inline the manifest
  router.get('*', async (req, res) => {
    const html = await renderByUrl(req, /* app */ undefined);
    const manifest = (res as any).locals?.costscopeManifest;
    const manifestScript = manifest
      ? `<script type="application/json" id="costscope-prefetch">${JSON.stringify(manifest)}</script>`
      : '';
    const withManifest = html.replace('</body>', `${manifestScript}</body>`);
    res.send(withManifest);
  });

  return router;
}
```

## Client-side

```ts
// somewhere early in app startup where you have a QueryClient
import { hydrateFromManifest, useProgressiveHydration } from '@costscope/backstage-plugin';

const manifest = hydrateFromManifest(queryClient); // seeds cache if present
useProgressiveHydration(manifest); // schedules lower-priority prefetches
```

## Notes

- Never inline tokens or headers; the manifest must contain only safe response data.
- Keep manifest small: seed P0 (overview) and let the client prefetch the rest.
- Align React Query `staleTime` with your internal client cache TTL if you keep it enabled on the client.
