/** @public */
export declare const CostscopeErrorCodes: {
    readonly TIMEOUT: "TIMEOUT";
    readonly HTTP_ERROR: "HTTP_ERROR";
    readonly NETWORK_ERROR: "NETWORK_ERROR";
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly UNKNOWN: "UNKNOWN";
};
/** @public */
export type CostscopeErrorCode = typeof CostscopeErrorCodes[keyof typeof CostscopeErrorCodes];
