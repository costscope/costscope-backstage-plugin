# Backend (dev stub)

This is a minimal development backend used by the example app.

Features:

- GET /health
- GET /api/catalog/entities -> [] (stub)
- Proxy: /api/costscope/\* -> configurable MOCK_TARGET (defaults to http://localhost:7007)

Run:

```bash
# from repo root
yarn workspace backend start
```

You can set env vars to override behavior:

- PORT (default 7008)
- MOCK_TARGET (default http://localhost:7007)
- FRONTEND_ORIGIN (default http://localhost:3000)
