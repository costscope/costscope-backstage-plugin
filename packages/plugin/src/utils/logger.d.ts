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
export type LogFn = (...args: any[]) => void;
export interface Logger {
    debug: LogFn;
    info: LogFn;
    log: LogFn;
    table: LogFn;
    warn: LogFn;
    error: LogFn;
}
export declare const debug: LogFn;
export declare const info: LogFn;
export declare const log: LogFn;
export declare const table: LogFn;
export declare const warn: LogFn;
export declare const error: LogFn;
export declare const logger: Logger;
export default logger;
