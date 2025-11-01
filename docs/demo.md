# Demo

Spin up an example Backstage app with the plugin wired in.

## Quick start (from repo root)

```bash
npm run demo
```

## Useful options

- Reset demo state (clean caches) before starting:

  ```bash
  npm run demo -- --reset
  ```

- Frontend‑only (no mock backend):

  ```bash
  npm run demo -- --frontend-only
  ```

## E2E helpers (from repo root)

```bash
npm run e2e:reuse
npm run e2e:smoke
```

## Static demo (GitHub Pages / minimal app)

Use the lightweight Vite app in `examples/minimal-app` to produce a fully static demo (no backend required). The data comes from an in‑browser mock client.

1. Build the static demo bundle with mock data baked in:

```bash
cd examples/minimal-app
yarn build:demo
```

2. Preview the built bundle on a host/port of your choice (the base path is already set for Pages):

```bash
yarn preview:host --port 5190 --strictPort --host
```

Open http://localhost:5190/costscope-backstage-plugin/minimal/costscope

3. Optional: run a tiny smoke test against that preview from the repo root:

```bash
PREVIEW_BASE=http://localhost:5190/costscope-backstage-plugin/minimal \
  npx playwright test -c playwright.preview.config.ts -g "Manual preview smoke"
```

Notes:

- No backend should be running for this mode; errors likely indicate the bundle was not built with `build:demo`.
- Re-run `yarn build:demo` if you change plugin code or minimal app code; then refresh the browser.
- The build step also writes `dist/404.html` (copy of `index.html`) to enable GitHub Pages SPA deep-link fallback. This ensures direct links like `/costscope-backstage-plugin/minimal/costscope` work when published.

Extra check (optional): verify the preview is Pages-ready

```bash
PREVIEW_URL=http://localhost:5190 node examples/minimal-app/scripts/verify-preview.mjs
```

This confirms base path, deep-link fallback behavior, and that the main asset is reachable.

## Notes

- Example app typically runs at http://localhost:3000. Override with APP_PORT if needed:

  ```bash
  APP_PORT=3001 npm run demo
  ```

- Mock backend proxy listens on PORT (default 7008) and forwards /api/costscope to your Backstage target (default http://localhost:7007). Override:

  ```bash
  PORT=7010 npm run demo
  ```

- You can override both in one go if desired:

  ```bash
  APP_PORT=3001 PORT=7010 npm run demo
  ```

- CORS is auto‑configured for the frontend origin; allow multiple by setting FRONTEND_ORIGINS as a comma‑separated list.
