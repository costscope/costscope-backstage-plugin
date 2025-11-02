# CONTRIBUTING / Contribution Guide for the Costscope Plugin

Welcome! guide covers: repository structure, local setup, tests, commit style (Conventional Commits), adding new API methods, and how work ties to the roadmap.

---

## 1. Principles / Ground Rules

### Fast pre-commit tests

- Be respectful and constructive.
- Prefer small, focused PRs over large “kitchen sink” changes.
- New logic requires tests.
- Keep the UI thin: aggregations and heavy computation belong in the backend or pre‑processing (FOCUS pipeline).

---

## 2. Repository Structure (essentials)

```
packages/contracts/     Single source of truth for OpenAPI (finops-api.json) + types/Zod generation
scripts/                Helper scripts (audit, diff, size, analysis, etc.)
src/
   api.ts               Client and the CostscopeApi interface
   components/          React components (overview card, tables, stories, snapshots)
   hooks/               Custom hooks (e.g., useProjectAnnotation)
   formatting.tsx       Currency/percent formatting provider
   downsample.ts        Time‑series downsampling logic
   queryKeys.ts         React Query keys
   plugin.*             Plugin exports (legacy and new Frontend Plugin API)
   test-mocks/          Backstage test mocks for Jest
README.md              Overview, architecture, roadmap
CONTRIBUTING.md        This guide
CHANGELOG.md           Change history (Keep a Changelog)
```

See a quick tree via:

```bash
tree -L 2 -I 'node_modules|dist'
```

---

## 3. Development Quickstart

Package manager: this monorepo uses Yarn v1 workspaces. npm installs are intentionally unsupported — `package-lock.json` generation is disabled via repo `.npmrc`. Use `yarn` commands shown below; avoid `npm install/ci` to keep installs deterministic.

```bash
yarn install              # install dependencies
yarn lint                 # lint (auto-fix: yarn lint:fix)
yarn typecheck            # tsc --noEmit
yarn test                 # single test run
yarn test --watch         # dev mode
yarn size                 # fast bundle budget check (see README Size‑limit)
yarn analyze              # deeper bundle analysis (treemap, as needed)
yarn storybook            # UI playground with mock API (http://localhost:6006)

# (optional) regenerate types/schemas after spec edits (in contracts)
yarn workspace @costscope/contracts build
```

ENV variables (example):

```bash
export FINOPS_API_BASE_URL=http://localhost:8080   # backend base URL
export COSTSCOPE_RUNTIME_VALIDATE=true             # enable zod validation (slower)
```

---

## 4. Tests

Stack: Jest + @testing-library/react + snapshots.

Cover:

- Number/currency formatting (see `formatting.test.tsx`).
- Component loading/error branches.
- Data transformations (e.g., downsample).
- Snapshots only for stable UI trees (cards/tables).

Guidelines:

- At least one behavioral assertion beyond snapshots.
- Mock at the boundaries (API / Backstage context), not everything.
- For React Query, wrap with the shared helper at `src/testing/utils/renderWithProviders.tsx`.
- Absolute imports are enabled in tests via the alias `src/*` (see `jest.config.cjs` and `tsconfig.json`). Example: `import { buildPath } from 'src/utils/buildPath'`.

### 4.1 Fast incremental test mode

For rapid local iteration and pre-commit hooks we use a custom fast runner:

`yarn test:fast`

Features:

- Detects staged (or if none, working tree) changed `packages/plugin/**/*.ts(x)` sources.
- Uses `jest --findRelatedTests` to select only impacted tests.
- Filters out slow/integration patterns: `transport`, `validation`, `*.integration.*`, `*.metrics.*`, `descriptor.hash`, `smoke-ssr` (set `ALWAYS_SLOW=1` to include them).
- Skips starting the mock backend unless a selected test is outside `utils/` (heuristic) to reduce CPU/memory.
- Stable cache dir at `temp/.jest-cache` for faster warm runs.
- Fallback smoke suite (3 quick utility tests) when no related tests are resolved.
- Optional heap usage logging (`FAST_HEAP=1`).

Environment toggles:

| Var              | Effect                                                     |
| ---------------- | ---------------------------------------------------------- |
| `FAST_TESTS=1`   | (Set internally) Signals global setup to skip mock server. |
| `ALWAYS_SLOW=1`  | Do not filter slow patterns; include everything related.   |
| `FAST_HEAP=1`    | Adds `--logHeapUsage` for memory diagnostics.              |
| `JEST_CACHE_DIR` | Override cache directory (defaults to `temp/.jest-cache`). |

Pre-commit hook now runs: `FAST_TESTS=1 yarn test:fast`.

Run full suite (with coverage + mock server) when needed:

```bash
yarn test
```

Force include slow tests while still skipping coverage:

```bash
ALWAYS_SLOW=1 yarn test:fast
```

Profile memory:

```bash
FAST_HEAP=1 yarn test:fast
```

If adding a new critical domain area that fast mode should treat as slow (e.g. heavy SSR or contract hashing), extend the `slowPatterns` array in `scripts/test-fast-runner.cjs`.

---

## 5. Code Style

- TypeScript strict settings (avoid `any` aside from explicit, commented exceptions).
- Prefer functional components and hooks; avoid class components.
- Naming: prefix public entities with `Costscope*`.
- Imports are ordered by the linter (see import/order rules).
- Avoid building a “mini‑framework” — prefer simple functions.

Local quality gate before opening a PR:

```bash
yarn verify
```

Quality commands cheat‑sheet:

- Lint: `yarn lint` / auto‑fix: `yarn lint:fix`
- Types: `yarn typecheck`
- Tests: `yarn test` (coverage enabled by default), watch: `yarn test --watch`
- Bundle budget: `yarn size` (CI‑friendly check; budgets in README). For a one‑shot gate, run `yarn verify`.
- Deep size analysis: `yarn analyze` (as needed)

---

## 6. Commit Style (Conventional Commits)

Format: `<type>(optional scope): <short summary>`

Common types:

- feat: new user‑facing functionality
- fix: bug fix
- docs: documentation only
- chore: infra / build / deps
- refactor: behavior‑preserving refactor
- test: tests added/updated
- perf: performance optimization
- build: build system changes
- ci: CI configuration changes

Example: `feat(api): add project-scoped breakdown endpoint`.

Mark BREAKING CHANGE via the footer:

```
feat(api)!: remove deprecated costscopePlugin export

BREAKING CHANGE: legacy export costscopePlugin removed; use costscope instead.
```

---

## 7. Branch & PR Workflow

- Branches: `feature/<slug>`, `fix/<slug>`, `chore/<slug>`.
- One PR = one logical task.
- PR description: context, what changed, screenshots (if UI), acceptance criteria, related issues.
- CI must be green (lint + typecheck + tests).

---

## 8. Adding a New API Method (step‑by‑step)

1. Update the OpenAPI spec: add paths/schemas to `packages/contracts/openapi/finops-api.json` (single source of truth).
2. Build the contracts package (CI does this on build; locally you can):
   ```bash
   yarn workspace @costscope/contracts build
   yarn typecheck
   ```
3. Ensure exported types/schemas are available from `@costscope/contracts`.
4. Extend the `CostscopeApi` interface (see `src/api.ts`).
5. Implement the method in `CostscopeClient`:
   - Build the URL (include the `project` query when applicable).
   - Use `getCached` for idempotent GETs with caching, otherwise `get`.
6. Use types/Zod schemas from `@costscope/contracts` (do not create local copies).
7. Add a React Query hook/call in the component and include a key in `queryKeys.ts` (if new).
8. Write tests (success + error + empty). In Storybook add states (Default / Loading / Error / Empty) via `parameters.mockApi`.
9. Run `yarn spec:hash` (proxy to `@costscope/contracts spec:hash`) — ensure the spec hash matches the embedded hash.
10. Update CHANGELOG (Unreleased) for user‑facing changes.

Fallback: If a schema isn’t yet available, you may temporarily define a local type (must include a TODO and update the spec before merge).

---

## 9. OpenAPI Typed Client — details

In short (see code for full logic):

- `openapi-typescript` generates type declarations.
- The client extracts response types using a `Json200` utility and returns strongly typed data.
- Stable fallback interfaces are used when generated types aren’t available.
- Zod validation is enabled by `COSTSCOPE_RUNTIME_VALIDATE`.

Sync check: `yarn spec:hash` (proxies SHA256 checks to the contracts package; no local generated copy remains).

---

## 10. Roadmap

A condensed roadmap is in `README.md`. Please check it before starting: current priorities include migrating to the new Frontend Plugin API, broader multi‑cloud support (Azure/GCP), the diff engine, and improved test coverage.

If your contribution doesn’t fit the current phase, open an issue to discuss — it may be tagged as “future.”

---

## 11. Release Process (Changesets)

Releases are managed by [Changesets](https://github.com/changesets/changesets): every user‑visible change should include a changeset file.

Steps:

1. Create a changeset:
   ```bash
   yarn changeset
   ```
   Select a bump (patch / minor / major) and write a short description.
2. Commit the generated `.changeset/*.md` to your PR.
3. Merging to `main` triggers `release-version.yml`, which:
   - runs typecheck / lint / tests / build;
   - runs `changeset version` (bumps versions + updates CHANGELOG);
   - opens/updates a `chore: version packages` PR.

Publishing happens via `release-publish.yml` when a tag `v*` is pushed. Going public: remove `"private": true` and add `NPM_TOKEN` (npm automation token). The publish workflow will run `npm publish --provenance`.

Manual fallback (rare):

```bash
yarn changeset version
git commit -am "chore: version"
git tag vX.Y.Z
git push && git push --tags
yarn changeset publish   # when the package is public
```

The legacy `npm version` flow is disabled (script exits) to keep CHANGELOG consistent.

### 11.1 How to write good Changesets

When you need a changeset:

- Any user‑visible change (new features, bug fixes, public API/props/exports changes).
- Pure internal changes that don’t affect consumers (refactors, tests, docs) typically don’t need a release (changeset optional).

Choosing the bump:

- patch — bug fixes that don’t change API/behavior (or minor a11y/perf improvements).
- minor — new functionality that’s backward compatible (new optional props/exports; off by default features).
- major — breaking: removed/renamed exports, contract changes, default behavior changes.

Authoring steps:

1. Run `yarn changeset` and select package(s) (e.g., `costscope-backstage-plugin`, and `@costscope/contracts` when contracts changed).
2. Select bump (patch/minor/major).
3. Write a concise user‑facing note for the CHANGELOG. Free form; optionally start with a conventional tone (`feat: ...`, `fix: ...`).
4. Commit `.changeset/<id>.md` in the PR.

Good examples:

// Historical stub extension examples (EntityCostscopeContentExtension, CostscopePageExtension) were removed; prefer manual routing.

- `fix: normalize NETWORK_ERROR mapping when fetch aborts early`
- `docs: expand README size‑limit section`

Tips:

- For public surface changes run `yarn api:check` (see below) and if intentional, update the snapshot.
- If size is impacted, run `yarn size`; for regressions, add a short rationale in the PR and, if possible, use `yarn analyze` to locate the source.

---

## 12. Security

For security issues: do not open a public issue with an exploit. Temporarily label an issue as `security` with minimal details; a maintainer will coordinate privately. See `SECURITY.md`.

### Security: Safe process execution in scripts

When invoking external commands from Node scripts or tests, avoid shell command strings built from variables or environment values. Prefer argumentized process execution to prevent shell interpretation and code injection risks.

- Do this (safe):
  - `cp.execFileSync('git', ['show', \`${ref}:${fileRelPath}\`], { stdio: 'pipe' })`
  - `cp.execFileSync('yarn', ['build'], { stdio: 'inherit' })`
- Not this (unsafe):
  - <code>cp.execSync(\`git show \${ref}:\${fileRelPath}\`)</code>
  - <code>cp.execSync('yarn build')</code>

Additional guidance:

- Do not use `spawn('bash', ['-c', '...'])` or `{ shell: true }`. Invoke the target binary directly with explicit arguments.
- For pipelines like `lsof -ti :3000 | xargs -r kill -9`, split into two steps:
  1.  `execFileSync('lsof', ['-ti', ':3000'])` to get PIDs
  2.  Iterate PIDs and `process.kill(pid, 'SIGKILL')`
- If you must compose dynamic strings (e.g., for a single `prog:arg` operand like `ref:file` in `git show`), keep it as a single argv entry and do not pass through a shell.

## We lint for these patterns in `scripts/**`, `packages/**/scripts/**`, and `tests-e2e/**`. If lint flags a usage, migrate to `execFile/execFileSync` with explicit args.

## 13. License

By contributing you license your code under Apache‑2.0 (see `LICENSE`).

---

## 14. FAQ / Quick answers

| Question                       | Short answer                                                                                             |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Lint fails                     | Run `yarn lint:fix`, then manually address remaining cases.                                              |
| Types drift after spec update  | `yarn workspace @costscope/contracts build && yarn typecheck` and update usages for new fields.          |
| Add a column to BreakdownTable | Add the field in the API (if it’s a new dimension), extend the type, then update the component/snapshot. |
| Test loading/error states      | Storybook: never‑resolving promise (loading) or throw (error). Jest: mock the client method.             |

---

## 15. Language note

This document is now in English. If you prefer a Russian translation, please open an issue; the earlier Russian‑first version can be found in git history.

Thank you for contributing!

---

## 16. Adding new error codes (CostscopeError.code)

This section describes how to add a new error code properly. We use a centralized definition in `src/errorCodes.ts` (exports `CostscopeErrorCodes` and `CostscopeErrorCode`) instead of editing a string union in place. The ESLint rule `internal/no-direct-error-codes` forbids using raw string literals for codes outside this file (tests and `.d.ts` excluded). Current set: `TIMEOUT`, `HTTP_ERROR`, `NETWORK_ERROR`, `VALIDATION_ERROR`, `UNKNOWN`. Add a new code ONLY if it brings distinct diagnostic/UX value that can’t be represented by existing statuses or messages.

### 16.1 When a new code IS needed

- Distinct UI handling branch (e.g., a specific banner/CTA).
- Different retryability strategy (logic depends on the code).
- Separate metric/telemetry category (track frequency independently).
- A semantically stable domain class (e.g., FUTURE: `RATE_LIMIT`, `BACKEND_SCHEMA_DRIFT`).

When a new code is NOT needed:

- It differs only by HTTP status (use `HTTP_ERROR` + `status`).
- It’s a transient debugging situation (use message or a `debug:` field in cause).
- It can be logically mapped to existing groups (e.g., network failures remain `NETWORK_ERROR`).

### 16.2 Naming rules

- Format: UPPER*SNAKE_CASE, only ASCII letters and `*`.
- Stability: don’t rename after release without a `BREAKING CHANGE`.
- No variable fragments (e.g., not `HTTP_403_FORBIDDEN`).

### 16.3 Steps to add one

1. Add a new pair to `CostscopeErrorCodes` in `src/errorCodes.ts` (value equals key). The `CostscopeErrorCode` type widens automatically.
2. Verify `CostscopeError` in `src/api.ts` uses `CostscopeErrorCode` (no change needed).
3. Decide where the error is produced:
   - System/network: inside `mapError`.
   - Pre/post‑validation: near the `VALIDATION_ERROR` logic.
   - Local client method: throw via `this.buildError({ code: 'NEW_CODE', ... })`.
4. Decide whether the code is critical for toasts: update `isCritical` if needed.
5. Telemetry:
   - Ensure `recordRetryAttempt` receives the `code` (automatic if you throw `CostscopeError`).
6. Tests (required):
   - Unit/integration scenario that raises the new code (mock fetch/Abort, etc.).
   - Assert: `await expect(...).rejects.toMatchObject({ code: 'NEW_CODE' })`.
   - Snapshot logs only if really valuable; prefer behavioral assertions.
7. Storybook (optional): add an Error state if the UI differs.
8. Docs:
   - CHANGELOG Unreleased → add `Added: new error code NEW_CODE for <purpose>`.
   - This CONTRIBUTING section already covers the process; no further doc edits needed.
9. Check for dead code: searching `NEW_CODE` (outside `errorCodes.ts` and tests) should find only expected places. The linter flags raw string literals if missed.

### 16.4 Semantic matrix (guidance)

| Category          | Example code     | Retriable     | Critical toast     | Notes                                |
| ----------------- | ---------------- | ------------- | ------------------ | ------------------------------------ |
| Network/transport | NETWORK_ERROR    | Yes           | Yes                | No HTTP status present               |
| Timeout           | TIMEOUT          | Yes           | Yes                | AbortController timeout              |
| HTTP status       | HTTP_ERROR       | It depends    | (>=500)            | Server responded; status in `status` |
| Client validation | VALIDATION_ERROR | No            | No                 | Data/schema error                    |
| Unknown           | UNKNOWN          | No            | Yes (if no status) | Fell into generic path               |
| (Future example)  | RATE_LIMIT       | Yes (backoff) | Yes                | 429 / API limits                     |

When adding a row, ensure it doesn’t duplicate existing semantics.

### 16.5 Anti‑patterns

- Overloading: creating near‑duplicates (e.g., `HTTP_FAILURE` while `HTTP_ERROR` exists).
- Over‑granularity: codes for each HTTP status (`HTTP_502`, `HTTP_503`, …) — inspect by status instead.
- Codes that depend on user text or locale.

### 16.6 Minimal example

```ts
// 1. Extend the union:
code: 'TIMEOUT' | 'HTTP_ERROR' | 'NETWORK_ERROR' | 'VALIDATION_ERROR' | 'UNKNOWN' | 'RATE_LIMIT';

// 2. Add a branch in mapError before the generic UNKNOWN:
if (e?.status === 429) {
  return this.buildError({
    code: 'RATE_LIMIT',
    message: 'Rate limited',
    status: 429,
    attempt: context.attempt,
    cause: e,
    correlationId: context.correlationId,
    path: context.path,
  });
}

// 3. Optionally in isCritical:
if (err.code === 'RATE_LIMIT') return true; // want to emphasize to the user

// 4. Test:
await expect(client.getOverview('P7D')).rejects.toMatchObject({ code: 'RATE_LIMIT', status: 429 });
```

### 16.7 Summary

Add a new error code only for a distinct handling/retry/UX branch. Update the union, the map/throw sites, optional critical classification, add tests, update CHANGELOG. Keep names stable, uppercase snake case, no dynamic fragments.

---

## 17. API Surface & Snapshot (API Extractor) — how to update

We guard the public API surface with API Extractor. The snapshot lives in `etc/costscope-backstage-plugin.api.md`.

Quick commands:

- Check without changing the snapshot: `yarn api:check`
- Strict check (local helper for CI): `yarn api:check:strict`
- Update the snapshot (when changes are intentional): `yarn api:snapshot`

Typical workflow:

1. You change exports (e.g., add a hook/component in `src/index.ts`).
2. Run `yarn api:check` — verify the diff is expected. Use `yarn api:diff` for a side‑by‑side view if needed.
3. Update the snapshot: `yarn api:snapshot` and commit the updated `etc/costscope-backstage-plugin.api.md`.

Recommendations:

- Avoid `export *` from internal paths — keep the surface small and stable.
- In the PR, explain why the new export is needed by consumers (Backstage app) and include a usage example.

Common errors and causes:

- `ae-forgotten-export`: a symbol leaks into public types but isn’t explicitly exported — either make it internal or add an explicit export/type.
- Accidental API growth: check barrel exports and types returned from `index.ts` (you may be leaking an internal type via params/return).

---

## 18. Size‑limit: how to run and what to do on failure

- Run: `yarn size` (fast build without d.ts and source maps, then `size-limit`). Budgets are in README (≤55KB gzip for the main ESM; validation is lazy‑loaded).
- If it fails:
  - Inspect the `size-limit` report (which entry exceeded).
  - Run `yarn analyze` and open `dist-analyze/bundle-analyze.html` (treemap) — find heavy deps.
  - Fixes: lazy‑load rare paths, replace default/barrel imports with named imports, avoid MUI v4/material-table, move heavy validation behind a feature flag.

In your PR, briefly describe the mitigation. If the regression is unavoidable, discuss beforehand and only adjust budgets with justification.
