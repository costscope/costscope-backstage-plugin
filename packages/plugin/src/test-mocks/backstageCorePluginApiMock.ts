// Minimal mock for @backstage/core-plugin-api for snapshot tests
export const costscopeApiRef = { id: 'plugin.costscope.service' } as any;
export const configApiRef = { id: 'core.config' } as any;
export function useApi() {
  return (globalThis as any).__COSTSCOPE_MOCK_API__;
}
