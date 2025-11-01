# Dev cache/SWR events panel

This page shows how to attach to the `CostscopeClient` internal cache event stream and render a tiny developer panel for diagnostics.

## What is emitted

Event objects share the shape `{ type, path, ts }`, with an extra `{ error }` field on `swr-revalidate-error`.

Types:

- `stale-serve` — served a stale value (SWR) and started background revalidation
- `swr-revalidate-start` — background revalidation started
- `swr-revalidate-success` — revalidation succeeded and cache updated
- `swr-revalidate-error` — revalidation failed; stale value may still be shown
- `swr-hard-expired` — past the hard staleness window; no stale value served

## Quick subscribe example (non-React)

```ts
const unsubscribe = client.subscribeCacheEvents((ev) => {
  // Example: pipe to your logger/telemetry
  console.debug('[costscope cache]', ev.type, ev.path);
});

// later when disposing
unsubscribe?.();
```

## React example: inline Dev Panel

```tsx
import * as React from 'react';
import { useCacheEvents } from '@costscope/backstage-plugin';

export function CacheDevPanel() {
  const [events, setEvents] = React.useState<
    Array<{ ts: number; type: string; path: string; error?: unknown }>
  >([]);

  // Keep last 200 events for quick scrolling
  useCacheEvents((ev) => setEvents((prev) => [...prev.slice(-199), ev]));

  return (
    <div
      role="region"
      aria-label="Costscope cache and SWR events"
      style={{
        fontFamily: 'monospace',
        fontSize: 12,
        maxHeight: 300,
        overflow: 'auto',
        border: '1px solid #e0e0e0',
        borderRadius: 6,
        padding: 8,
        background: '#fafafa',
      }}
    >
      <strong>Cache/SWR events</strong>
      <div style={{ opacity: 0.7, marginBottom: 6 }}>
        Newest at the bottom. Only emitted when internal cache is enabled.
      </div>
      {events.length === 0 ? (
        <div style={{ opacity: 0.7 }}>No events yet — trigger any Costscope request.</div>
      ) : (
        events.map((e, i) => (
          <div key={i}>
            {new Date(e.ts).toLocaleTimeString()} | {e.type} | {e.path}
            {e.type === 'swr-revalidate-error' ? (
              <span style={{ color: '#c00' }}> — error</span>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}
```

## Notes

- Development aid only; avoid shipping this panel in production UIs.
- Relies on the internal cache stream; if you construct the client with `enableInternalCache:false`, no events are emitted.
- The `useCacheEvents` hook is the easiest way in Backstage components because it resolves the client via `useApi(costscopeApiRef)` under the hood.
- For automation or unit tests, you can subscribe directly on the client instance you create inside the test.
