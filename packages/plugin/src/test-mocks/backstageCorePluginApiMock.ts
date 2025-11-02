// Minimal mock for @backstage/core-plugin-api for unit tests
export function createApiRef(def: { id: string }) {
  return { id: def.id } as any;
}
export const costscopeApiRef = { id: 'plugin.costscope.service' } as any;
export const configApiRef = { id: 'core.config' } as any;
export function useApi() {
  return (globalThis as any).__COSTSCOPE_MOCK_API__;
}
