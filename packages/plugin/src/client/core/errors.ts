import { CostscopeErrorCodes, type CostscopeErrorCode } from '../../errorCodes';

/** @public */
export interface CostscopeError extends Error {
  __costscope: true;
  code: CostscopeErrorCode;
  message: string;
  status?: number;
  attempt: number;
  cause?: any;
  correlationId: string;
  path?: string;
  schemaHash?: string;
}

export function buildError(params: Omit<CostscopeError, '__costscope' | 'name'>): CostscopeError {
  return { __costscope: true, name: 'CostscopeError', ...params };
}

export function mapError(
  e: any,
  context: { path: string; attempt: number; correlationId: string; timeoutMs: number },
): CostscopeError {
  if (e && e.__costscope) return e as CostscopeError;
  if (e?.name === 'AbortError') {
    return buildError({
      code: CostscopeErrorCodes.TIMEOUT,
      message: `Request timeout after ${context.timeoutMs}ms for ${context.path}`,
      attempt: context.attempt,
      cause: e,
      correlationId: context.correlationId,
      path: context.path,
    });
  }
  if (!e?.status) {
    return buildError({
      code: CostscopeErrorCodes.NETWORK_ERROR,
      message: e?.message || 'Network error',
      attempt: context.attempt,
      cause: e,
      correlationId: context.correlationId,
      path: context.path,
    });
  }
  return buildError({
    code: CostscopeErrorCodes.UNKNOWN,
    message: e?.message || 'Unknown error',
    status: e?.status,
    attempt: context.attempt,
    cause: e,
    correlationId: context.correlationId,
    path: context.path,
  });
}

export function isCritical(
  err: CostscopeError,
  cfg?: { statuses?: number[]; codes?: CostscopeErrorCode[] },
): boolean {
  if (cfg) {
    if (err.status && cfg.statuses && cfg.statuses.includes(err.status)) return true;
    if (cfg.codes && cfg.codes.includes(err.code)) return true;
    return false;
  }
  if (err.status && err.status >= 500) return true;
  if (err.code === CostscopeErrorCodes.TIMEOUT) return true;
  if ((err.code === CostscopeErrorCodes.NETWORK_ERROR || err.code === CostscopeErrorCodes.UNKNOWN) && !err.status)
    return true;
  if (err.code === CostscopeErrorCodes.VALIDATION_ERROR) return false;
  return false;
}

/**
 * Runtime type guard for narrowing unknown errors to CostscopeError.
 * Public helper intentionally exported (lightweight – checks brand flag only).
 */
/** @public */
export function isCostscopeError(e: any): e is CostscopeError {
  return !!(e && (e as any).__costscope === true);
}
