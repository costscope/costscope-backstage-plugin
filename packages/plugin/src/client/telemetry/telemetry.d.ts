import { recordRetryAttempt as baseRecordRetryAttempt, recordCacheEvent as baseRecordCacheEvent } from './retryTelemetry';
import { recordValidationEvent as baseRecordValidationEvent } from './validationTelemetry';
export type ExternalTelemetryEvent = ({
    type: 'cache';
} & Parameters<typeof baseRecordCacheEvent>[0] & {
    ts: number;
}) | ({
    type: 'retry';
} & Parameters<typeof baseRecordRetryAttempt>[0] & {
    ts: number;
}) | ({
    type: 'validation';
} & Parameters<typeof baseRecordValidationEvent>[0] & {
    ts: number;
});
export declare function registerTelemetryListener(fn: (e: ExternalTelemetryEvent) => void): () => void;
export declare const recordRetryAttempt: (p: Parameters<typeof baseRecordRetryAttempt>[0]) => void;
export declare const emitRetryAttemptExternal: (p: Parameters<typeof baseRecordRetryAttempt>[0]) => void;
export declare const recordCacheEvent: (p: Parameters<typeof baseRecordCacheEvent>[0]) => void;
export declare const recordValidationEvent: (p: Parameters<typeof baseRecordValidationEvent>[0]) => void;
