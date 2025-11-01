import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  CostscopePage,
  costscopeApiRef,
  createCostscopeClient,
  PLUGIN_VERSION,
} from '@costscope/backstage-plugin';
import { createMockCostscopeApi } from './mockClient';
import {
  discoveryApiRef,
  fetchApiRef,
  identityApiRef,
  alertApiRef,
  errorApiRef,
  configApiRef,
  featureFlagsApiRef,
} from '@backstage/core-plugin-api';
import { ApiProvider, LocalStorageFeatureFlags } from '@backstage/core-app-api';

// Provide minimal Backstage API stubs just enough for the plugin.
const staticDiscovery = {
  getBaseUrl: async (id) => (id === 'costscope' ? 'http://localhost:7007/api/costscope' : ''),
};
const identityApi = { getUserId: async () => 'user', getProfileInfo: async () => ({}) };
const fetchApi = { fetch: (input, init) => fetch(input, init) };
const alertApi = { post: () => {} };
const errorApi = { post: () => {} };
const configApi = { getOptionalString: () => undefined };
const featureFlagsApi = new LocalStorageFeatureFlags();

// Choose between real client and in-browser mock for static deployments (e.g., GitHub Pages)
const DEMO_MODE = import.meta.env?.VITE_DEMO_MODE || 'real';
const client =
  DEMO_MODE === 'mock'
    ? createMockCostscopeApi()
    : createCostscopeClient(configApi, {
        discoveryApi: staticDiscovery,
        fetchApi,
        identityApi,
        alertApi,
        errorApi,
      });
// Provide API implementations via a minimal ApiHolder compatible object (Backstage expects a .get(ApiRef) method)
const apiPairs = [
  [costscopeApiRef, client],
  [discoveryApiRef, staticDiscovery],
  [fetchApiRef, fetchApi],
  [identityApiRef, identityApi],
  [alertApiRef, alertApi],
  [errorApiRef, errorApi],
  [configApiRef, configApi],
  [featureFlagsApiRef, featureFlagsApi],
];
const apiImplsById = new Map(apiPairs.map(([ref, impl]) => [ref.id, impl]));
const apis = { get: ref => apiImplsById.get(ref.id) };

const queryClient = new QueryClient();

function App() {
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.debug(
      '[costscope-backstage-plugin] mounted minimal app, plugin version',
      PLUGIN_VERSION,
    );
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <ApiProvider apis={apis}>
        {/* Use Vite-provided BASE_URL so the app works under GitHub Pages subpath */}
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            {/* Redirect root to the plugin route so index path works on Pages */}
            <Route path="/" element={<Navigate to="/costscope" replace />} />
            {/* Catch-all to handle deep links and unknown paths under the basename */}
            <Route path="*" element={<Navigate to="/costscope" replace />} />
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
      </ApiProvider>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById('root')).render(<App />);
