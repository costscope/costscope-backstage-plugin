/** @public */
export declare const DEFAULT_PERIOD = "P30D";
/** @public */
export declare const DEFAULT_BREAKDOWN_DIMENSION = "ServiceCategory";
/** @public */
export declare const CURRENCY = "USD";
/** @public */
export declare const PROJECT_ANNOTATION = "costscope.io/project";
/** @public */
export declare const PROJECT_QUERY_PARAM = "project";
/** @public */
export declare const DEFAULT_SERVICE_ID = "costscope";
/** @public */
export declare function resolveServiceId(configApi?: {
    getOptionalString(path: string): string | undefined;
}): string;
