# Quick Start

Get Costscope up and running in your Backstage app in minutes.

## 1) Install the plugin

```bash
yarn workspace app add @costscope/backstage-plugin
```

## 2) Register the API client

```ts
import { createApiFactory, costscopeApiRef } from '@costscope/backstage-plugin';

apis.register(
  createApiFactory({
    api: costscopeApiRef,
    deps: { discoveryApi, fetchApi, identityApi, errorApi, alertApi },
    factory: (deps) => new CostscopeClient(deps),
  }),
);
```

## 3) Add the cost page route

```tsx
import { CostscopePage } from '@costscope/backstage-plugin';

<Route path="/costscope" element={<CostscopePage />} />;
```

## 4) Open your portal

Navigate to `/costscope` and start exploring your cloud costs!

> Extended configuration, authentication, endpoints reference and FAQ have moved to: [docs/CONFIGURATION_AND_FAQ.md](./CONFIGURATION_AND_FAQ.md)
