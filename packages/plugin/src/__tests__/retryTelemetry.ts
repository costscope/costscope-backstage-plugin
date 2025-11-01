// Re-export retry telemetry helpers for tests as named ESM exports.
// These are plain functions/values in the source module, so a direct re-export is fine.
export {
	recordRetryAttempt,
	getRetryAttemptRecords,
	clearRetryAttemptRecords,
} from '../client/telemetry/retryTelemetry';

export {
	recordCacheEvent,
	getCacheRecords,
	clearCacheRecords,
} from '../client/telemetry/retryTelemetry';
