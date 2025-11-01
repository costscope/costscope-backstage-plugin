# Developer Guide: `src/` layout and where things live

Updated: 2025-08-16

This guide explains how the source is organized and where to place new code.

## TL;DR

- UI for a specific FinOps endpoint goes under `src/features/<area>` (e.g., `overview`, `breakdown`, `alerts`). Keep components thin; data via hooks.
- Cross-cutting visual blocks live in `src/components/*` (charts, tables, controls, pages).
- The API client and low-level transport/cache/validation live in `src/client/*` (no React/MUI).
- Backstage integration (plugin/extension wiring) lives in `src/app/*`.
- Shared hooks (formatting, project scope, SSR hydration) live in `src/hooks/*`.

## Why this layout

- Keeps dependencies flowing one way (client -> features -> app) and prevents UI from reaching into transport details.
- Aligns with repo rules: no direct console; use `utils/logger`. No hardcoded service id; use constants/helpers.
- Helps stay within size budgets by isolating optional/lazy chunks.

## Adding a new feature example (`datasets`)

1. Create `src/features/datasets/{ui,hooks,__tests__}`.
2. Hook file `useDatasets.ts` calls the client, wraps with React Query, exports types.
3. UI components consume the hook and use MUI v5; tests in `__tests__`.
4. If a reusable table emerges, move it to `src/components/tables`.

## Tests

- Prefer colocating tests under `__tests__` within a feature or client submodule.
- Keep shared test helpers in `src/testing` and `src/test-mocks`.

## Storybook

- Stories should mock client methods via `parameters.mockApi`. Place stories next to the component or under `stories/` inside the feature.

## API client code moves

- When moving `transport/cache/validation` into `src/client/*`, keep top-level re-exports temporarily from previous paths to avoid breaking imports. Remove after one minor.

