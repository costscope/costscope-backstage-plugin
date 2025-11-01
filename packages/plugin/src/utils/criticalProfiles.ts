import { CostscopeErrorCodes, type CostscopeErrorCode } from '../constants/errors';

/**
 * Predefined profiles for critical error classification.
 * Use these to configure CostscopeClient `critical` option.
 * - defaultHeuristic: use built-in behavior (pass undefined)
 * - transientInfra: only 502/503/504 and TIMEOUT/NETWORK_ERROR are critical
 * - minimal: nothing is critical (suppress toasts unless you emit manually)
 * @public
 */
export const CriticalProfiles = {
  /** Use the client's default heuristic (equivalent to omitting `critical`) */
  defaultHeuristic: undefined as undefined,
  /** Transient infra-focused profile */
  transientInfra: {
    statuses: [502, 503, 504],
    codes: [
      CostscopeErrorCodes.TIMEOUT,
      CostscopeErrorCodes.NETWORK_ERROR,
    ] as CostscopeErrorCode[],
  },
  /** Disable all built-in critical classifications */
  minimal: {
    statuses: [] as number[],
    codes: [] as CostscopeErrorCode[],
  },
} as const;
