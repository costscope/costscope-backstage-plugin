// Shim module: re-export error code definitions from consolidated constants module.
// This preserves the public import path './errorCodes' for backward compatibility.
export { CostscopeErrorCodes } from './constants/errors';
export type { CostscopeErrorCode } from './constants/errors';
