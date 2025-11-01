# Runtime Validation

The plugin supports optional runtime response validation using Zod. It is disabled by default to keep the default bundle small and the hot path fast.

## Enabling Validation

Enable it only in development or pre‑prod by setting the environment variable:

```bash
export COSTSCOPE_RUNTIME_VALIDATE=true
```

## Tradeoffs

### Pros

- Early detection of backend/contract drift
- Structured `VALIDATION_ERROR`s include `schemaHash` for triage
- Lightweight telemetry counters available

### Cons

- Adds a lazy‑loaded chunk and per‑request parse overhead
- Not recommended for production unless you need the safety net

## How It Works

When enabled, the client logs a one‑time schema hash and compares it against the OpenAPI spec hash fragment from `@costscope/contracts`. If they differ, a single warning is emitted and `errorApi.post` receives a diagnostic error to aid debugging.

You can also force validation per request via component options even if the env flag is off.
