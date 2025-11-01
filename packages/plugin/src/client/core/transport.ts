import { DEFAULT_SERVICE_ID } from '../../constants';
import { CostscopeErrorCodes } from '../../errorCodes';
import { buildError, mapError, isCritical, type CostscopeError } from '../../errors';
import { logger } from '../../utils/logger';
import { validateIfEnabled } from '../../validation';
// Record attempts via dev-only retry telemetry so tests and local diagnostics can observe them directly.
import { recordRetryAttempt } from '../telemetry/retryTelemetry';
// Emit external-only events (no internal mutation) via the unified telemetry surface.
import { emitRetryAttemptExternal } from '../telemetry/telemetry';

export interface TransportDeps { discoveryApi: any; fetchApi: any; identityApi: any; errorApi?: any; alertApi?: any; silent?: boolean; critical?: { statuses?: number[]; codes?: string[] }; serviceId?: string; largePayloadWarnedPaths: Set<string>; }
export interface RetryConfig { timeoutMs: number; retry: { maxAttempts: number; retryOn: number[]; backoffBaseMs: number; jitterFactor?: number } }

// Lightweight, sampling-based JSON size estimator to avoid allocating a giant
// string via JSON.stringify for large payloads. Returns an approximate byte
// count sufficient for warning/telemetry. Intentionally shallow to keep cost
// predictable. For arrays, sample up to SAMPLE items to estimate average.
function estimateJsonBytes(value: unknown, sample: number = 64): number | undefined {
	try {
		const seen = new WeakSet<object>();

		const prim = (v: unknown): number => {
			switch (typeof v) {
				case 'string': return (v as string).length + 2; // quotes
				case 'number': return 8; // ballpark
				case 'boolean': return 5; // true/false upper bound
				case 'bigint': return 16; // rough
				case 'undefined': return 9; // "undefined" (non-JSON, but safe upper bound)
					case 'function': return 0;
				case 'object': return v === null ? 4 : 0; // null
				default: return 0;
			}
		};

		const obj = (o: any): number => {
			if (!o) return 0;
			if (seen.has(o)) return 0; // avoid cycles
			seen.add(o);
			if (Array.isArray(o)) {
				const n = o.length;
				if (n === 0) return 2; // []
				const k = Math.min(n, sample);
				let acc = 0;
				for (let i = 0; i < k; i++) {
					const v = o[i];
					acc += typeof v === 'object' && v !== null ? obj(v) : prim(v);
				}
				const avg = acc / k;
				// Add commas + brackets overhead roughly
				const overhead = Math.max(0, n - 1);
				return Math.floor(avg * n) + overhead + 2;
			}
			// plain object (shallow)
			let sum = 2; // {}
			for (const [k, v] of Object.entries(o)) {
				sum += k.length + 3; // "key":
				sum += typeof v === 'object' && v !== null ? obj(v) : prim(v);
				sum += 1; // comma or trailing
			}
			return sum;
		};

		if (value && typeof value === 'object') return obj(value);
		return prim(value);
	} catch {
		return undefined;
	}
}

export async function httpGet<T>(
	path: string,
	cfg: RetryConfig,
	deps: TransportDeps,
	correlationId: string,
	registerController?: (_p: string, _c: AbortController) => void,
	externalSignal?: AbortSignal,
	opts?: { validate?: boolean },
): Promise<T> {
	const baseUrl = await deps.discoveryApi.getBaseUrl(deps.serviceId || DEFAULT_SERVICE_ID);
	const { token } = await deps.identityApi.getCredentials();
	const startAll = Date.now();
	let attempt = 0; let lastError: any;
	while (attempt < cfg.retry.maxAttempts) {
		attempt += 1;
		const controller = new AbortController();
		registerController?.(path, controller);
		let externallyAborted = false;
		if (externalSignal) {
			if (externalSignal.aborted) { externallyAborted = true; try { controller.abort(); } catch { /* abort ignore */ } }
			else externalSignal.addEventListener('abort', () => { externallyAborted = true; try { controller.abort(); } catch { /* abort ignore */ } }, { once: true });
		}
		const timeout = setTimeout(() => { if (!controller.signal.aborted) controller.abort(); }, cfg.timeoutMs);
		try {
			const res = await deps.fetchApi.fetch(`${baseUrl}${path}`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'x-correlation-id': correlationId }, signal: controller.signal as AbortSignal });
			clearTimeout(timeout);
			if (!res.ok) {
				if (cfg.retry.retryOn.includes(res.status) && attempt < cfg.retry.maxAttempts) {
					const baseDelay = cfg.retry.backoffBaseMs * Math.pow(2, attempt - 1);
					const jf = cfg.retry.jitterFactor ?? 0;
					const min = baseDelay * (1 - jf);
					const delay = jf > 0 ? (min + Math.random() * (baseDelay - min)) : baseDelay;
					await new Promise(r => setTimeout(r, delay));
					continue;
				}
				throw buildError({ code: CostscopeErrorCodes.HTTP_ERROR, message: `HTTP ${res.status} for ${path}`, status: res.status, attempt, correlationId, path });
			}
			const json = await res.json();
			try {
				const env = (globalThis as any)?.process?.env;
				if (env?.NODE_ENV !== 'production' && !deps.largePayloadWarnedPaths.has(path)) {
					const est = estimateJsonBytes(json);
					if (typeof est === 'number' && est > 1_000_000) {
						deps.largePayloadWarnedPaths.add(path);
						const kb = (est / 1024).toFixed(1);
						const mb = (est / 1024 / 1024).toFixed(2);
						logger.warn(`[Costscope API] Large payload ~${kb} KB (${mb} MB) for '${path}'. Consider optimizing backend aggregation.`);
					}
				}
			} catch { /* size warn ignore intentionally */ }
			// Provide errorApi directly to validation (also keep global bridge as a best-effort fallback)
			try { (globalThis as any).__COSTSCOPE_ERROR_API__ = deps.errorApi; } catch { /* ignore */ }
			await validateIfEnabled(path, json, attempt, correlationId, opts?.validate, deps.errorApi);
			try {
			const durationMs = Date.now() - startAll; let itemCount: number | undefined; let overviewLength: number | undefined; if (Array.isArray(json)) { itemCount = json.length; if (path.startsWith('/costs/daily')) overviewLength = json.length; }
			let responseBytes: number | undefined; try { responseBytes = estimateJsonBytes(json); } catch { /* estimation ignore intentionally */ }
			const payload = { path, attempts: attempt, success: true, status: 200, durationMs, overviewLength, responseBytes, itemCount } as const;
			recordRetryAttempt(payload);
			try { emitRetryAttemptExternal(payload as any); } catch { /* external emit ignore */ }
			} catch { /* telemetry ignore intentionally */ }
			return json as T;
		} catch (e: any) {
			clearTimeout(timeout);
			const mapped = mapError(e, { path, attempt, correlationId, timeoutMs: cfg.timeoutMs });
			if (externallyAborted) { lastError = mapped; break; }
			if ((mapped.code === CostscopeErrorCodes.TIMEOUT || mapped.code === CostscopeErrorCodes.NETWORK_ERROR) && attempt < cfg.retry.maxAttempts) {
				const baseDelay = cfg.retry.backoffBaseMs * Math.pow(2, attempt - 1);
				const jf = cfg.retry.jitterFactor ?? 0;
				const min = baseDelay * (1 - jf);
				const delay = jf > 0 ? (min + Math.random() * (baseDelay - min)) : baseDelay;
				await new Promise(r => setTimeout(r, delay));
				lastError = mapped; continue;
			}
			lastError = mapped;
			if (mapped.code === CostscopeErrorCodes.HTTP_ERROR) {
				// Terminal HTTP error: emit externally and surface alert if classified critical
				try { emitRetryAttemptExternal({ path, attempts: attempt, success: false, status: mapped.status, code: mapped.code, durationMs: Date.now() - startAll }); } catch { /* telemetry ignore intentionally */ }
				if (!deps.silent && deps.alertApi && isCritical(mapped as any, deps.critical as any)) {
					try { deps.alertApi.post({ message: `Costscope error: ${mapped.code} (${mapped.status ?? 'n/a'}) corr=${correlationId}`, severity: 'error' }); } catch { /* alert ignore intentionally */ }
				}
				throw mapped;
			}
			break;
		}
	}
		const finalError: CostscopeError = lastError;
		try {
		const payload = { path, attempts: finalError.attempt, success: false, status: finalError.status, code: finalError.code, durationMs: Date.now() - startAll } as const;
		recordRetryAttempt(payload as any);
		try { emitRetryAttemptExternal(payload as any); } catch { /* external emit ignore */ }
		} catch { /* telemetry ignore intentionally */ }
		if (deps.errorApi) { try { const reported = new Error(`[Costscope API] ${finalError.message} (code=${finalError.code} status=${finalError.status ?? 'n/a'} path=${path} corr=${correlationId} attempt=${finalError.attempt})`); (reported as any).cause = finalError; deps.errorApi.post(reported); } catch { /* errorApi ignore intentionally */ } }
	if (!deps.silent && deps.alertApi && isCritical(finalError as any, deps.critical as any)) { try { deps.alertApi.post({ message: `Costscope error: ${finalError.code} (${finalError.status ?? 'n/a'}) corr=${correlationId}`, severity: 'error' }); } catch { /* alert ignore intentionally */ } }
	throw finalError;
}
