import { useApi } from '@backstage/core-plugin-api';
import { useEffect, useRef } from 'react';

import { costscopeApiRef } from '..';
import type { CacheEvent } from '../telemetry/retryTelemetry';

/**
 * React hook subscribing to CostscopeClient cache/SWR events.
 * Example:
 *   useCacheEvents(ev => console.log(ev));
 */
/** @public */
export function useCacheEvents(listener: (e: CacheEvent) => void) {
  const api: any = useApi(costscopeApiRef);
  const listenerRef = useRef(listener);
  listenerRef.current = listener;
  useEffect(() => {
    if (!api?.subscribeCacheEvents) return;
  const unsub = api.subscribeCacheEvents((_e: CacheEvent) => listenerRef.current(_e));
    return () => { try { unsub?.(); } catch { /* noop */ } };
  }, [api]);
}
