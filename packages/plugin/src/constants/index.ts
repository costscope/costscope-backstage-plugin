/** @public */
export const DEFAULT_PERIOD = 'P30D';
/** @public */
export const DEFAULT_BREAKDOWN_DIMENSION = 'ServiceCategory';
// Default currency only used as fallback; primary selection now via FormattingProvider (app-config)
/** @public */
export const CURRENCY = 'USD';
// NOTE: currency/percent formatting moved to formatting context (see formatting.tsx)
// Entity annotation used to scope costs to a specific logical project / cost grouping
/** @public */
export const PROJECT_ANNOTATION = 'costscope.io/project';
// Query param name sent to backend when annotation present
/** @public */
export const PROJECT_QUERY_PARAM = 'project';

// Discovery service ID for backend FinOps API (can be overridden via app-config costscope.serviceId)
/** @public */
export const DEFAULT_SERVICE_ID = 'costscope';

/** @public */
export function resolveServiceId(configApi?: { getOptionalString(path: string): string | undefined }): string {
  try {
    const fromConfig = configApi?.getOptionalString('costscope.serviceId');
    return fromConfig || DEFAULT_SERVICE_ID;
  } catch {
    return DEFAULT_SERVICE_ID;
  }
}
