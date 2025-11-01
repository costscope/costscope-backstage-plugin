# Running tests locally and why we need shims/mappings

This project includes a few targeted Jest shims and module mappings to make the package test suite stable when running from the monorepo.

If you run the package tests from the repository root you may need to set a couple of Node options so Jest can load the ESM-driven helpers used during tests.

Why

- Some code in the repository (ESLint rule implementations, generated validator artifacts, etc.) is authored or emitted as ESM (.mjs / .js that uses `import`).
- Jest runs under CommonJS during collection and may try to `require()` those files which produces "Must use import to load ES Module" errors.
- We prefer to run tests against source (Option A) rather than built artifacts to keep iteration fast. To allow this, the package-level `jest.config.cjs` includes a small set of `moduleNameMapper` entries and test-only CJS shims that:
  - map problematic ESM specifiers used by tests to local CJS shims under `packages/plugin/src/test-mocks/`
  - map generated validator imports to their TypeScript sources so Jest can transform them (via `ts-jest`/`babel-jest`)

Where the mappings live

- `packages/plugin/jest.config.cjs` — package-level overrides and `moduleNameMapper` entries for the plugin tests.
- `packages/plugin/src/test-mocks/` — lightweight CJS shims used by tests when a CJS shape is required (e.g., ESLint RuleTester helpers.

Running tests locally

- Run the package tests from the repository root with the recommended flags to avoid ESM / VM module errors and to give enough heap for TypeScript transforms:

```bash
NODE_OPTIONS='--experimental-vm-modules --max-old-space-size=4096' \
  npx jest --config packages/plugin/jest.config.cjs --runInBand packages/plugin -i
```

- The `--experimental-vm-modules` flag enables dynamic ESM semantics used by some test helpers. The larger heap avoids intermittent OOMs when transforming many TS files.

Option B — dist smoke (validate built artifacts)

- CI may run a separate smoke check against the built `dist/` output to validate that the published bundle behaves as expected. This is intentionally separate from the source-first tests.
- If you want a local smoke run, build the package and then run the smoke script (if present) — e.g.:

```bash
# Build the package (from repo root)
yarn build
# Run dist smoke (CI script name may vary)
yarn workspace plugin run dist-smoke || npx node scripts/smoke.js
```

Notes and maintenance

- Keep the `moduleNameMapper` entries in `packages/plugin/jest.config.cjs` minimal and targeted. If you add new tests that import ESM artifacts directly, prefer mapping those few patterns rather than enabling broad transforms on node_modules.
- If you decide to remove the shims in the future, update tests to import from the source TypeScript modules instead of emitted ESM JS files.

If anything here breaks on your machine, share the exact failing command and output and I will help update the mappings/shims.
