import { recordRetryAttempt as baseRecordRetryAttempt, recordCacheEvent as baseRecordCacheEvent } from './retryTelemetry';
import { recordValidationEvent as baseRecordValidationEvent } from './validationTelemetry';

// Unified external telemetry event surface for consumers (dev or prod).
// Consumers can pass a callback in CostscopeClientOptions.telemetry to receive these.
export type ExternalTelemetryEvent =
	| ({ type: 'cache' } & Parameters<typeof baseRecordCacheEvent>[0] & { ts: number })
	| ({ type: 'retry' } & Parameters<typeof baseRecordRetryAttempt>[0] & { ts: number })
	| ({ type: 'validation' } & Parameters<typeof baseRecordValidationEvent>[0] & { ts: number });

const listeners = new Set<(_e: ExternalTelemetryEvent) => void>();

export function registerTelemetryListener(fn: (_e: ExternalTelemetryEvent) => void): () => void {
	listeners.add(fn);
	return () => { try { listeners.delete(fn); } catch { /* ignore */ } };
}

function emit(event: ExternalTelemetryEvent) {
	for (const l of listeners) {
		try { l(event); } catch { /* listener error ignored */ }
	}
}

export const recordRetryAttempt = (p: Parameters<typeof baseRecordRetryAttempt>[0]) => {
	try { baseRecordRetryAttempt(p); } catch { /* ignore */ }
	try { emit({ type: 'retry', ...p, ts: Date.now() }); } catch { /* ignore */ }
};

// For cases where internal dev-only retry records must NOT be mutated (e.g., terminal HTTP errors),
// emit to external listeners only.
export const emitRetryAttemptExternal = (p: Parameters<typeof baseRecordRetryAttempt>[0]) => {
	try { emit({ type: 'retry', ...p, ts: Date.now() }); } catch { /* ignore */ }
};

export const recordCacheEvent = (p: Parameters<typeof baseRecordCacheEvent>[0]) => {
	try { baseRecordCacheEvent(p); } catch { /* ignore */ }
	try { emit({ type: 'cache', ...p, ts: Date.now() }); } catch { /* ignore */ }
};

export const recordValidationEvent = (p: Parameters<typeof baseRecordValidationEvent>[0]) => {
	try { baseRecordValidationEvent(p); } catch { /* ignore */ }
	try { emit({ type: 'validation', ...p, ts: Date.now() }); } catch { /* ignore */ }
};
