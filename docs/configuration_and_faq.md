# Costscope Plugin – Configuration & FAQ

This document consolidates advanced configuration, authentication, endpoint reference, and troubleshooting guidance for the Costscope Backstage plugin.

## Backend / API Configuration

The plugin discovers the Costscope backend using Backstage discovery. Default service id: `costscope`.

```yaml
# app-config.yaml (excerpt)
discovery:
  endpoints:
    - type: plugin
      name: costscope
      target: https://your-costscope-api.example.com/api/costscope

# Optional local proxy variant
proxy:
  '/costscope':
    target: 'http://localhost:7007/api/costscope'
```

Override the service id if needed:

```yaml
costscope:
  serviceId: custom-costscope
```

Then match with a discovery endpoint `name: custom-costscope`.

## Authentication

The client forwards a Backstage identity token when available:

```http
Authorization: Bearer <backstage-identity-token>
```

If your backend requires a different credential:

1. Use a Backstage `proxy:` entry that injects headers, or
2. Supply a wrapped `fetchApi`:

```ts
import {
  createApiFactory,
  fetchApiRef,
  discoveryApiRef,
  identityApiRef,
} from '@backstage/core-plugin-api';
import { costscopeApiRef, CostscopeClient } from '@costscope/backstage-plugin';

apis.register(
  createApiFactory({
    api: costscopeApiRef,
    deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef, identityApi: identityApiRef },
    factory: (deps) =>
      new CostscopeClient({
        ...deps,
        fetchApi: {
          fetch: (input: RequestInfo, init?: RequestInit) => {
            const headers = new Headers(init?.headers as any);
            headers.set('x-api-key', process.env.COSTSCOPE_API_KEY!);
            return deps.fetchApi.fetch(input, { ...init, headers });
          },
        },
      }),
  }),
);
```

## Minimal & Extended Endpoints

| Path                     | Purpose            | Notes                                                            |
| ------------------------ | ------------------ | ---------------------------------------------------------------- |
| `/costs/daily`           | Daily time series  | Accepts `period`, `project` query params (`P30D` default period) |
| `/costs/overview`        | Aggregated summary | Required for summary cards                                       |
| `/costs/top-services`    | Top N services     | Optional – UI hides if 404/absent                                |
| `/costs/recommendations` | Optimization hints | Optional feature panel                                           |
| `/metadata/projects`     | Project scope list | Drives project selector (entity annotation)                      |
| `/health`                | Health check       | Operational monitoring                                           |

Required: `daily`, `overview`. Others are opportunistic.

## Full Example Configs

Local development (`app-config.local.yaml`):

```yaml
discovery:
  endpoints:
    - type: plugin
      name: costscope
      target: http://localhost:7007/api/costscope

proxy:
  '/costscope':
    target: 'http://localhost:7007/api/costscope'

costscope:
  formatting:
    currency: USD
```

Production (`app-config.production.yaml`):

```yaml
discovery:
  endpoints:
    - type: plugin
      name: costscope
      target: https://finops.internal.example.com/api/costscope

costscope:
  serviceId: costscope
  formatting:
    currency: USD
```

## Project Scoping

Annotate catalog entities:

```yaml
metadata:
  annotations:
    costscope.io/project: payments-platform
```

The plugin adds `?project=payments-platform` to cost queries. Missing annotation = global scope.

## FAQ / Troubleshooting

### Nothing loads / blank page

Likely discovery mismatch or network 404. Confirm endpoint name matches configured (default `costscope`).

### 401 / 403 errors

Backend not accepting Backstage token. Add auth gateway or inject API key via custom `fetchApi`.

### Slow / large responses

Payload > ~1MB triggers a console warning in dev. Reduce period window, aggregate server-side, or paginate.

### Project scoping not working

Check annotation spelling and that backend supports `project` query param.

### Different default currency

Set `costscope.formatting.currency` or provide custom formatting provider.

### Disable runtime schema validation

Use production build or disable via env flag (see runtime validation doc) to skip dev-only validation cost.

### Rename service id

Set `costscope.serviceId: finops` and rename discovery endpoint to `finops`.

### Очистка устаревших артефактов (stale build / stale package)

При локальной разработке иногда возникает ситуация, когда примерное Backstage-приложение или Storybook подхватывают старый собранный бандл плагина (кеш tsup / jest / .cache webpack). Добавлены вспомогательные скрипты:

| Скрипт                | Назначение                                                            |
| --------------------- | --------------------------------------------------------------------- |
| `yarn clean:dist`     | Удаляет каталог `dist`, временные `temp`, build info файлы TypeScript |
| `yarn clean:caches`   | Удаляет jest cache и internal webpack caches примеров                 |
| `yarn clean:stale`    | Последовательно выполняет `clean:dist` и `clean:caches`               |
| `yarn dev:full:reset` | Полная перезагрузка: очистка + повторный запуск `dev:full`            |

Рекомендуемый поток, если видите «подтягивает старую версию»:

```bash
yarn dev:full:reset
```

Если нужно только пересобрать без очистки кешей:

```bash
yarn clean:dist && yarn build:size
```

Так минимизируется время простоя, но гарантируется отсутствие устаревших JS артефактов.

## Issue Tracking

Open issues or discussions in the backend repo: <https://github.com/costscope/costscope>.

---

Return to: [Top-Level README](../README.md)
