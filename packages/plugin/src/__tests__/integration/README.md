# Integration tests (forked-runner)

## Approach

- The Jest test `live-contract.test.js` is a plain JS harness that forks a child process.
- The child executes a bundled client runner via `runner-bundle-client.cjs` which uses `esbuild`
  to bundle `src/client/index.ts` into a Node-compatible CJS module and runs the integration assertions
  against a local mock upstream.

## Why this design

- Avoids Jest trying to parse TypeScript/TSX during collection.
- Avoids fragile ts-node ESM/loader interactions and dependency extensionless-import problems.
- Fast and deterministic in CI and local runs.

## How to run locally

From package root:

```bash
# run the single integration test (forked)
NODE_OPTIONS=--experimental-vm-modules yarn test --packages plugin --runInBand src/__tests__/integration/live-contract.test.js -i
```

## Dist smoke (before release)

- Use the `dist-smoke` script to run a smoke check against the built `dist` bundle.

## How to run the dist smoke locally

1. Build the package:

```bash
yarn build
```

2. Run the smoke script:

```bash
yarn dist-smoke
```

This script bundles the source client into a Node CJS artifact and runs the integration checks against the provided `UPSTREAM_BASE`.
