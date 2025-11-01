# Context

Costscope Backstage Plugin monorepo providing a Backstage frontend plugin (`costscope-backstage-plugin`) and supporting packages (`@costscope/contracts`, `mock-backend`, example Backstage apps). Primary language: TypeScript (Node >=20). Frontend stack: React 18, Material UI v5 (`@mui/material`), TanStack React Query v5, Recharts, Backstage core plugin APIs. Tooling: tsup (bundling), TypeScript (5.x), Babel (for Jest), Jest (unit tests + jsdom), Playwright (E2E tests), Storybook 8, size-limit (@size-limit/file) for bundle budgets, Changesets for versioning & release PRs, API Extractor for public API snapshot (`etc/*.api.md`), custom ESLint flat config with internal rules, Prettier, Husky + lint-staged. CI: multiple GitHub Actions workflows (`ci.yml`, `e2e*.yml`, `storybook.yml`, `size-limit.yml`, `security-audit.yml`, `codeql.yml`, `release-version.yml`, `release-publish.yml`, `openssf-scorecard.yml`, `chromatic.yml`, `sync-examples.yml`, etc.). Security tooling: CodeQL, nightly npm audit + osv-scanner SARIF, OpenSSF Scorecard, custom ESLint security rules. Observability (in-code): internal logger abstraction (avoid direct `console.*`). Contracts & validation: `@costscope/contracts` (OpenAPI generated types + Zod validators) with runtime validation optionally toggled (lazy-loaded) and hash/spec descriptor checks. Publishing: npm with provenance on tag push (`v*`). Monorepo uses Yarn v1 workspaces.

# Checklist & Change Process

When executing a user request:

1. Extract an explicit, numbered requirements list (assumptions clearly marked). Missing detail? Infer safely or ask only if blocking.
2. Plan minimal viable change set: smallest safe diff preserving public API & style; flag any potential BREAKING CHANGE early.
3. For code changes: add/update tests (unit + at least one edge case). If public API changes: update API snapshot via `yarn api:snapshot` and mention in PR rationale.
4. Run locally (in order): `yarn install --frozen-lockfile`, `yarn lint`, `yarn typecheck`, `yarn test`, `yarn build`, `yarn size`, and any targeted `yarn api:check` / `yarn api:check:strict` / `yarn spec:check` if related areas changed.
5. Keep patch focused: avoid unrelated formatting (let Prettier handle touched lines only). Preserve existing imports ordering, naming, code style.
6. Provide delta output only in iterative follow-ups (no re-dumping untouched sections). Mark added/removed lines succinctly.
7. When offering multiple implementation or design options: (1) list each briefly with 1–2 concise pros/cons, (2) explicitly mark a Recommended option, (3) justify recommendation (risk, diff size, maintainability, performance, security), (4) default preference is the minimal viable, lowest‑risk diff unless user goal emphasizes another axis (e.g., performance, extensibility).
8. For UI changes: consider bundle impact (`yarn size`), lazy-load heavy/rare paths.
9. For dependency additions: justify (functionality gap, maintenance, security posture, size). Prefer tree-shakable, permissive licensed, actively maintained packages.
10. Update docs: README sections, `docs/*.md`, CHANGELOG (through Changesets), inline JSDoc/comments where reasoning is subtle.
11. Do NOT create git branches, commits, or push to remote on behalf of the user. Prepare patches, scripts, or exact commands and obtain explicit approval before performing any git branch/commit/push actions.

# Security

- Never commit secrets, API keys, tokens, credentials, or sensitive endpoints. Use environment variables / GitHub Secrets.
- Maintain least privilege: new workflows / scripts should request minimal `permissions:` in GitHub Actions.
- Use existing logger; do not leak PII or secrets into logs, errors, or thrown messages.
- Avoid deprecated or unsafe Node / browser APIs (no `new Buffer()`, no `eval`, no insecure random generation for security contexts).
- Validate external inputs with existing Zod schemas (`@costscope/contracts`) or introduce new schemas close to boundary.
- On permission/IAM changes (e.g., new Actions scopes or npm publish requirements), document in PR description and relevant docs.
- Keep dependencies updated; do not ignore high/critical vulnerabilities. If a transitive vulnerability forces a temporary allow, document justification and follow-up issue.

# Observability

- Use structured logging (existing logger abstraction) instead of `console.*` (blocked by custom ESLint rule), except in scripts where explicitly allowed.
- Add metrics/tracing hooks only if existing framework supports; otherwise keep instrumentation minimal (low cardinality identifiers, avoid user-provided free-form labels).
- Propagate correlation/context IDs consistently through async code when available.
- Avoid logging entire objects with secrets; selectively log stable identifiers.

# Performance

- Mind bundle size budgets (≤ documented gzip limit for main ESM). Use `yarn size` after material UI or data layer changes.
- Lazy-load rare components / heavy validation logic; maintain splitting boundaries used by tsup.
- Assess algorithmic complexity for data transforms (keep typical UI reactions O(n) in dataset size, avoid nested loops over large arrays).
- Avoid unnecessary re-renders: memoize expensive selectors, prefer stable hook dependencies, leverage React Query caching effectively.
- For performance changes, briefly reason expected impact or add a micro-benchmark (optional) or size-limit diff explanation.

# Documentation

- Update relevant `docs/*.md` and README when adding features, configuration flags, or changing behavior.
- Explain configuration precedence (environment vars, Backstage discovery vs proxy) when altering config-related code.
- Update API docs via snapshot (API Extractor) for public type changes and describe rationale.
- Inline comments: clarify non-obvious logic, performance hacks, security checks, feature flags.
- Keep CHANGELOG entries through Changesets: summarize user-visible changes, mark BREAKING clearly with migration notes.

# Supply Chain

- Choose dependencies with permissive licenses (Apache-2.0, MIT, BSD) and active maintenance.
- Avoid large, single-purpose libs when smaller utilities suffice; consider tree-shakeability.
- Justify new dependency in PR (why built-in / existing deps insufficient, size & security profile).
- Update SBOM / vulnerability scanning implicitly through existing workflows; if adding non-js assets or binaries, document provenance.
- Keep `resolutions` minimal and justify each pin (link to upstream issue when possible).

# CI/CD

- All PRs must pass `ci.yml` matrix (Node 20 & 22): lint, typecheck, tests, build, API surface check, size-limit, audit.
- Maintain green `codeql.yml`, `security-audit.yml`, `size-limit.yml`, `storybook.yml`, `chromatic.yml` where relevant.
- Releases: version PR via Changesets (`release-version.yml`), publish via tag push (`release-publish.yml`) with provenance.
- If changing public API, update snapshot before merging to keep `api:check:strict` green.
- When E2E tests are touched, run related Playwright workflows locally first (`yarn test:e2e:quick` or full) to avoid flakiness.
- Validate generated artifacts: API docs (`etc/*.api.md`), dist bundle, Storybook build (if UI components changed).

# Restrictions

- No deprecated Material UI v4 imports (`@material-ui/*`) — enforced by ESLint rule.
- No direct `console.*` in runtime plugin source (custom rule). Use logger abstraction.
- No direct use of internal service IDs or error codes outside designated constants & mapping logic.
- Avoid wildcard barrel exports that expand public API inadvertently.
- Do not hardcode backend endpoints; rely on Backstage discovery/proxy patterns.
- Avoid vendor lock-in abstractions without clear extension points (document if unavoidable).
- Keep Node engine compatibility (>=20) and ensure new features don’t pull in unsupported Node APIs.

# Global Rules

- Use "+" to signify explicit confirmation/yes inside internal checklists (when requested).
- Never bypass pre-commit hooks (`husky`) or use `--no-verify`.
- No emojis in code, commit messages, docs, or PR descriptions.
- English only across code, comments, docs (existing bilingual note in template is legacy; prefer English moving forward).
- Preserve file headers, licenses, and existing comment style.
- Do NOT create git branches, commits, or push changes to remote on behalf of the user. Prepare patches, scripts, or exact commands and obtain explicit user approval before modifying repository history or pushing.

- For multi-line or multi-step console scripts, avoid pasting long scripts in chat. Prefer creating a temporary script file in the project root named `tmp-*.sh` with `#!/usr/bin/env bash` and `set -euo pipefail`, then execute it. Always create a file if the script exceeds 180 characters. Keep chat commands short and one-liners only when strictly necessary.

# PR Checklist

Before marking implementation as done, ensure:

- Tests green (`yarn test` or CI). Coverage goals (80% statements/lines) not regressed significantly; justify if below.
- Lint & typecheck clean (`yarn lint`, `yarn typecheck`).
- Size limit passes (`yarn size`).
- API surface intentional (run `yarn api:check` / update snapshot if needed).
- Security scans: no new HIGH/CRITICAL vulnerabilities (CI audit step).
- Docs updated (README/docs, inline comments) & Changeset added for user-facing changes.
- Artifacts regenerated: API snapshot, dist build, storybook (if applicable).
- No unexpected drift in OpenAPI spec hash or runtime descriptor (`yarn spec:check`).
- No stray debug statements, console logs, or leftover experiment flags.

# Workflow (Assistant internal steps)

1. Extract & list requirements (explicit + inferred, numbered).
2. Gather context (read relevant manifests, source files, tests, docs affected).
3. Propose minimal change plan (bullets: files to touch, tests to add, risks, alternatives if needed).
4. Implement edits (apply patch) + create/modify tests + update docs & changeset.
5. Run build/test pipeline locally; summarize pass/fail succinctly (lint/typecheck/tests/size/api/spec).
6. Provide a final summary: what changed, why, verification results, follow-up suggestions.

# From Scratch Requests

When asked to create new component/module/feature from scratch:

- Scaffold minimal viable structure (source file + test + export + docs entry) within appropriate package (`packages/plugin/src/...`).
- Add unit test(s): happy path + one edge/error case.
- Update public export only if needed; guard with API snapshot update when intentional.
- Provide concise usage example in PR description or docs.
- Include quick run instructions (e.g., how to run test, build, view in Storybook if UI component).
- If blocked (missing domain details, ambiguous API contract), state blockers clearly and offer safe assumptions or request clarifications.

# Technology-Specific Best Practices

## TypeScript / React / Backstage

- Favor explicit type exports; avoid leaking internal utility types via public component props.
- Keep React components pure, avoid side effects in render; use hooks for data (React Query) with stable query keys.
- Prefer composition over inheritance; keep components small & focused.
- For Backstage integration, use provided plugin APIs (catalog, discovery) rather than hardcoded fetch paths.

## React Query

- Use descriptive, tuple-based query keys; avoid including unstable objects/functions.
- Set appropriate stale times for static data vs cost time-series (balance freshness vs network).
- Handle loading/error states explicitly; leverage suspense patterns cautiously.

## Zod Validation

- Keep runtime validation behind feature flag / dynamic import for heavy schemas; ensure lazy path remains tree-shakable.
- Align schema changes with OpenAPI spec updates; update hash and descriptor checks.

## Bundling (tsup)

- Externalize peer deps (React, React DOM, Backstage core) — already enforced in scripts; keep new peers externalized.
- Avoid large default imports; prefer named imports for MUI & Recharts.
- Do not introduce circular dependencies (run `node scripts/check-recursion.js`).

## Testing (Jest / Playwright)

- Co-locate tests near source or in dedicated `__tests__` directories; follow existing patterns.
- Mock heavy dependencies (e.g., charts) in unit tests to keep them fast.
- Use Playwright tags (`@smoke`) for selective E2E runs; keep smoke path stable.

## Storybook

- Add stories for new visual components; ensure accessibility (aria labels, keyboard focus) and deterministic examples.
- Keep stories lightweight; mock network calls or use static fixtures.

## API Extractor

- After altering public exports, run `yarn api:check` then `yarn api:snapshot` when intentional; include snapshot diff in PR.
- Avoid `export *` from deep internals; explicit exports clarify surface.

## Size Limit

- Monitor both main ESM and validation-included budgets; if regression > ~1KB gzip provide justification & mitigation.
- Use `yarn analyze` for deep dives; split code or lazy-load bulky paths.

## GitHub Actions

- Limit new workflow permissions; reuse composite actions if pattern emerges.
- Fail fast on quality gates; prefer explicit steps over monolithic scripts for clearer logs.

# Edge Cases & Error Handling

- Network: surface retryable vs user-actionable errors distinctly (use structured error codes defined centrally).
- Timeouts / cancellations: clean up async effects; avoid state updates after unmount.
- Large datasets: paginate or window time-series; avoid O(n^2) merges.
- SSR (if integrated): guard browser-only APIs behind environment checks.

# Internal Custom ESLint Rules

- Respect custom prohibitions: no internal imports in UI from restricted paths, no raw contract imports (use public entry points), no runtime console, no wildcard barrel expansions.
- If rule adjustment needed, modify rule implementation & document rationale; update tests/examples if present.

# Breaking Changes Policy

- Only introduce breaking changes with prior discussion. Provide migration path, update docs & CHANGELOG, increment version appropriately via Changesets (semantic).
- Offer temporary shims or deprecation warnings where feasible.

# Communication

- Be explicit about assumptions, especially around cost data semantics or FOCUS spec fields.
- When uncertain about a domain nuance, propose 1–2 safe implementation options with trade-offs.

---

This file guides AI-assisted contributions for consistency, safety, and maintainability across the Costscope Backstage Plugin monorepo.
