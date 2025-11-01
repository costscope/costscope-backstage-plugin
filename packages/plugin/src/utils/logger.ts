/**
 * Central logger utility.
 *
 * Usage: import { logger } from './utils/logger';
 * Policy:
 * - Runtime code should not call console.* directly (tests & dev utilities may).
 * - In production (NODE_ENV==='production') debug/info/log/table no-op.
 * - warn/error always pass through so deprecation & error signals surface.
 * - Sites intentionally logging very large payloads may still use a direct console.warn with an
 *   inline comment referencing this policy (kept out of the abstraction to avoid serialization cost).
 */
import { __DEV } from '../build-consts';

// Generic function type (loose — logging accepts arbitrary data)
export type LogFn = (...args: any[]) => void;

const noop: LogFn = () => {};

export interface Logger {
  debug: LogFn;
  info: LogFn;
  log: LogFn;
  table: LogFn;
  warn: LogFn;
  error: LogFn;
}

// Named exports for direct import at call sites. When `__DEV` is false these
// become `noop` constants and bundlers can DCE call-sites that are inside
// compile-time-false branches.
export const debug: LogFn = __DEV ? (...a) => { try { console.debug(...a); } catch { /* ignore */ } } : noop;
export const info: LogFn = __DEV ? (...a) => { try { console.info(...a); } catch { /* ignore */ } } : noop;
export const log: LogFn = __DEV ? (...a) => { try { console.log(...a); } catch { /* ignore */ } } : noop;
export const table: LogFn = __DEV ? (...a) => { try { (console as any).table ? (console as any).table(...a) : console.log(...a); } catch { /* ignore */ } } : noop;
export const warn: LogFn = (...a) => { try { console.warn(...a); } catch { /* ignore */ } };
export const error: LogFn = (...a) => { try { console.error(...a); } catch { /* ignore */ } };

// Default logger object for code still importing the legacy default export.
export const logger: Logger = {
  debug,
  info,
  log,
  table,
  warn,
  error,
};

export default logger;
