/// <reference types="react" />
/**
 * usePrefetchOnVisibility
 *
 * IntersectionObserver-based prefetch trigger. Invokes provided callback the first
 * time (or every time if once=false) the referenced element becomes visible.
 * Falls back to immediate invocation when IntersectionObserver is unavailable
 * (e.g., JSDOM) so tests still warm caches.
 */
/** @public */
export declare function usePrefetchOnVisibility(cb: () => Promise<any> | any, opts?: {
    threshold?: number;
    rootMargin?: string;
    once?: boolean;
}): {
    readonly ref: import("react").MutableRefObject<HTMLElement | null>;
    readonly hasPrefetched: boolean;
};
