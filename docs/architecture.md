# Architecture Overview

## Modules

- **packages/contracts (@costscope/contracts)**: Domain schemas & OpenAPI/Zod contracts. Builds to dist (ESM) + d.ts; publishes public types.
- **packages/plugin (costscope-backstage-plugin)**: Backstage frontend plugin consuming contracts. Provides UI components, data hooks, optional runtime validation.
- **packages/mock-backend (planned rename of `backend`)**: Lightweight Express mock implementing a subset of contract endpoints for local dev / e2e.
- **examples/backstage-app**: Full Backstage host app for integration, docs, manual QA.
- **examples/minimal-app**: Slim Vite host for rapid UI iteration & smoke.

## Data / Control Flow

```
   Host App (Backstage / Minimal)
            |
            v
   costscope-backstage-plugin (UI logic, hooks)
            |
            v
      @costscope/contracts (typed client, zod schemas)
            |
            v
     Mock Backend (dev/e2e)  ---> Real FinOps Service (future)
```

## Build Graph (target)

```
@costscope/contracts  -->  costscope-backstage-plugin  --> examples/*
          (tsc)                (tsup + tsc)               (dev only)
```

## TypeScript Project References (planned)

- contracts tsconfig builds declarations first.
- plugin tsconfig references contracts for incremental rebuild.
- root tsconfig solution aggregates both.

## Dependency Rules

- UI code imports contracts only via `@costscope/contracts` alias.
- No example imports allowed inside publishable plugin bundle.
- Mock backend never imported by plugin (enforced by lint rule idea `no-internal-imports-in-ui`).

## Publishing Safeguards

- `files` & `exports` in plugin limit surface.
- API Extractor snapshot to catch signature drift.
- `spec:hash` from contracts ensures schema consistency.
- `recursion:check` blocks pathological install layouts.

## Size Control

- `size-limit` monitors ESM entry + (planned) full validation build.

## Future Enhancements

- Replace Yarn classic with pnpm for stricter hoisting.
- Promote mock-backend rename & TS typing.
- Add storybook config package if customization grows.
- Add dedicated size target for production tree-shaken path.
