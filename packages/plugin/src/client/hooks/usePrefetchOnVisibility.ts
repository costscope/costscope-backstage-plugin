import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * usePrefetchOnVisibility
 *
 * IntersectionObserver-based prefetch trigger. Invokes provided callback the first
 * time (or every time if once=false) the referenced element becomes visible.
 * Falls back to immediate invocation when IntersectionObserver is unavailable
 * (e.g., JSDOM) so tests still warm caches.
 */
/** @public */
export function usePrefetchOnVisibility(
  cb: () => Promise<any> | any,
  opts?: { threshold?: number; rootMargin?: string; once?: boolean },
) {
  const { threshold = 0, rootMargin, once = true } = opts || {};
  const ref = useRef<HTMLElement | null>(null);
  const didPrefetchRef = useRef(false);
  const [hasPrefetched, setHasPrefetched] = useState(false);

  const run = useCallback(async () => {
    if (once && didPrefetchRef.current) return;
    didPrefetchRef.current = true;
    try { await cb(); } catch { /* swallow – prefetch errors surface elsewhere */ }
    setHasPrefetched(true);
  }, [cb, once]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      // No IO support – invoke asap (microtask) so effect ordering preserved
      Promise.resolve().then(run);
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          run();
          if (once) obs.disconnect();
          break;
        }
      }
    }, { threshold, rootMargin });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, rootMargin, once, run]);

  return { ref, hasPrefetched } as const;
}
