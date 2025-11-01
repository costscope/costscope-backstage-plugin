import {
  discoveryApiRef,
  fetchApiRef,
  identityApiRef,
  alertApiRef,
  errorApiRef,
  configApiRef,
} from '@backstage/core-plugin-api';
import { createVersionedContext, createVersionedValueMap } from '@backstage/version-bridge';
import { CostscopePage, costscopeApiRef, createCostscopeClient } from '@costscope/backstage-plugin';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Provide minimal Backstage API stubs just enough for the plugin.
// eslint-disable-next-line
const staticDiscovery = {
  getBaseUrl: async (id) => (id === 'costscope' ? 'http://localhost:7007/api/costscope' : ''),
};
const identityApi = { getUserId: async () => 'user', getProfileInfo: async () => ({}) };
const fetchApi = { fetch: (input, init) => fetch(input, init) };
const alertApi = { post: () => {} };
const errorApi = { post: () => {} };
const configApi = { getOptionalString: () => undefined };

const client = createCostscopeClient(configApi, {
  discoveryApi: staticDiscovery,
  fetchApi,
  identityApi,
  alertApi,
  errorApi,
});
// Minimal API holder map
const apiMap = new Map([
  [costscopeApiRef, client],
  [discoveryApiRef, staticDiscovery],
  [fetchApiRef, fetchApi],
  [identityApiRef, identityApi],
  [alertApiRef, alertApi],
  [errorApiRef, errorApi],
  [configApiRef, configApi],
]);

// Create versioned api context provider compatible with useApi
const ApiContext = createVersionedContext('api-context');
function MinimalApiProvider({ children }) {
  const value = React.useMemo(
    () => createVersionedValueMap({ 1: { get: (ref) => apiMap.get(ref) } }),
    [],
  );
  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MinimalApiProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/costscope"
              element={
                <div data-testid="costscope-page-root">
                  <CostscopePage />
                </div>
              }
            />
          </Routes>
        </BrowserRouter>
      </MinimalApiProvider>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById('root')).render(<App />);
