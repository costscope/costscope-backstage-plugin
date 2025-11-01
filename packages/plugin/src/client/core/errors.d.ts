import { type CostscopeErrorCode } from '../../errorCodes';
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
export declare function buildError(params: Omit<CostscopeError, '__costscope' | 'name'>): CostscopeError;
export declare function mapError(e: any, context: {
    path: string;
    attempt: number;
    correlationId: string;
    timeoutMs: number;
}): CostscopeError;
export declare function isCritical(err: CostscopeError, cfg?: {
    statuses?: number[];
    codes?: CostscopeErrorCode[];
}): boolean;
/**
 * Runtime type guard for narrowing unknown errors to CostscopeError.
 * Public helper intentionally exported (lightweight – checks brand flag only).
 */
/** @public */
export declare function isCostscopeError(e: any): e is CostscopeError;
