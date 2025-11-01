# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2025-09-03

### Removed

- Legacy extension stubs `CostscopePageExtension` & `EntityCostscopeContentExtension` (never provided automatic routing; use `<CostscopePage />` with manual React Router integration). `costscope.extensions` is now an empty array.
- Dev/example dependency on `@backstage/core-components` (pulled in MUI v4); example now relies solely on plugin components to avoid mixed MUI versions.

### Docs

- Purged legacy sandbox documentation & references (removed deprecated docker sandbox doc).
- Clarified UI framework policy: only **MUI v5 (@mui/**)\*_ is officially supported; imports from legacy `@material-ui/_` (v4) are now blocked via ESLint (`no-restricted-imports`).

### Added

- Wave 1 widgets & hooks: `ProvidersPanel`, `DatasetFreshnessCard`, `CostSummaryHeader`, hooks `useProviders`, `useDatasets`, `useSummary`, prefetch integration.
- Wave 2 analytical widgets: `CostDriversCard` (top N breakdown) and `ChargeCategoryDonut` (charge category share) + hook `useTopBreakdown`.
- Wave 3 dataset exploration: `searchDatasets` client method, hooks `useDatasetSearch` / `useDatasetsSearch`, lazy `DatasetSearchPageLazy` (code-split), supporting `DatasetSearchPanel` stories.
- Extended `CostscopeClient` methods: `getProviders`, `getDatasets`, `searchDatasets`, `health`, mandatory `getSummary`, plus enriched `prefetchAll` (now returns summary/providers/datasets conditionally).
- Playwright E2E auto minimal sandbox fallback: detects heavy missing-module cascades and auto re-scaffolds with `SANDBOX_MINIMAL=1` (disable via `E2E_DISABLE_AUTO_MINIMAL=1`).
- Telemetry: new `CacheEvent` paths for `/providers`, `/datasets`, `/datasets/search`, `/costs/summary` (hit/miss/stale/SWR events) documented in README.
- Contract sync test for mock server (deterministic seed hashing, field whitelists) with sha256 snapshot for providers & datasets search.
- Accessibility tests (axe) for new widgets & pages; all critical violations at 0.

### Changed

- `getSummary` is now a required client method (previously optional in some flows) and included in `prefetchAll` result shape.
- Adjusted peer range for `@backstage/core-components` to `>=0.17.5 <0.18.0` (latest MUI v5-aligned 0.17.x line) and enforced MUI v5-only policy; legacy mixed v4/v5 setups are not supported.
- Mock server fields aligned to minimal UI surface (providers: name; datasets: createdAt; summary: prevPeriodCost key) and health endpoint normalized to `{ status: 'ok' }`.
- Bundle size growth within guardrails (< +0.5KB Wave 1–2; Wave 3 total +0.33KB brotli) — no performance remediation required.
- Unified critical error policy automatically covering new endpoints (no overrides required).
- ESLint config now ignores `tmp/**` (sandbox) to suppress tsconfig project parsing noise.

Current highlights:

- Backstage frontend plugin scaffolding with React + MUI v5 and React Query
- CostscopeClient with discovery-based service ID resolution and error normalization
- Optional runtime validation gated by COSTSCOPE_RUNTIME_VALIDATE
- Storybook with mock API and basic a11y in components

When preparing for the first release, convert this to a Keep a Changelog format and archive prior items into versioned sections.
