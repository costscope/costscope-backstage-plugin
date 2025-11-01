/** @public */
export const CostscopeErrorCodes = {
  TIMEOUT: 'TIMEOUT',
  HTTP_ERROR: 'HTTP_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNKNOWN: 'UNKNOWN',
} as const;

/** @public */
export type CostscopeErrorCode = typeof CostscopeErrorCodes[keyof typeof CostscopeErrorCodes];
