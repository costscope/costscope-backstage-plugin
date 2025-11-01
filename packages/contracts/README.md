# @costscope/contracts

Shared contract artifacts (OpenAPI spec, generated TypeScript types, Zod schemas) for Costscope / FinOps Insights.

## Contents

- `openapi/finops-api.json` – authoritative spec
- Generated: `finops-api.ts` (types + SPEC_HASH export)
- Generated: `finops-zod.ts` (Zod schema objects per component/schema)
- `OPENAPI_SPEC_HASH` export for drift detection

## Usage

Install in your Backstage plugin or backend:

```ts
import type { paths } from '@costscope/contracts';
import { OPENAPI_SPEC_HASH, zodSchemas } from '@costscope/contracts';
```

Runtime drift detection: Consumers (e.g. the UI plugin) compare the embedded `OPENAPI_SPEC_HASH` against a descriptor or locally expected value to warn when their installed contracts version lags behind the backend. Always bump the contracts package after modifying the spec so downstream builds surface the new hash.

## Workflows

- `yarn build` – regenerate types + zod + package dist
- `yarn spec:hash` – verify generated file matches spec SHA256
- `yarn spec:check` – build + hash check

## Publishing

Prepublish runs build + hash check. Ensure CHANGELOG entry (future) and bump version.

## License

Apache-2.0
