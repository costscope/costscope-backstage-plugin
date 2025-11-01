# Size Limits

The `yarn size` script performs a fast, CI‑friendly bundle size check using a lightweight build that skips type declarations and source maps.

## Budgets Enforced

- **Core ESM entry** (`dist/index.mjs`) ≤ 55 KB gzip
- **Optional validation chunk** (`dist/validation-*.mjs`) ≤ 135 KB gzip

## How It Works

Under the hood it runs `build:size` (no `--dts`, no source maps) and then `size-limit` with the configuration from `.size-limit.cjs`.

## Running Size Checks

Run locally or in CI:

```bash
yarn size
```

## Bundle Size Policy

The displayed size-limit badge tracks only the default ESM entry (`dist/index.mjs`) which is what a Backstage app consumes under normal operation. The large optional Zod validation chunk is **lazy‑loaded** only when the environment variable `COSTSCOPE_RUNTIME_VALIDATE=true` is present (development / pre‑prod safety net).

A second internal size budget (documented in `.size-limit.cjs`) monitors the worst‑case size when validation is enabled so regressions there are still visible without penalizing the common production path.
