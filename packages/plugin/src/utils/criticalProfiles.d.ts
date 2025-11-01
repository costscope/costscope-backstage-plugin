import { type CostscopeErrorCode } from '../constants/errors';
/**
 * Predefined profiles for critical error classification.
 * Use these to configure CostscopeClient `critical` option.
 * - defaultHeuristic: use built-in behavior (pass undefined)
 * - transientInfra: only 502/503/504 and TIMEOUT/NETWORK_ERROR are critical
 * - minimal: nothing is critical (suppress toasts unless you emit manually)
 * @public
 */
export declare const CriticalProfiles: {
    /** Use the client's default heuristic (equivalent to omitting `critical`) */
    readonly defaultHeuristic: undefined;
    /** Transient infra-focused profile */
    readonly transientInfra: {
        readonly statuses: readonly [502, 503, 504];
        readonly codes: CostscopeErrorCode[];
    };
    /** Disable all built-in critical classifications */
    readonly minimal: {
        readonly statuses: number[];
        readonly codes: CostscopeErrorCode[];
    };
};
