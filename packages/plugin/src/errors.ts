// Shim: re-export errors API from client core to preserve import stability after relocation.
export type { CostscopeError } from './client/core/errors';
export { buildError, mapError, isCritical, isCostscopeError } from './client/core/errors';
