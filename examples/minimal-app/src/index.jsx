import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
import { CostscopePage, costscopeApiRef, createCostscopeClient } from '@costscope/backstage-plugin';

// Provide minimal Backstage API stubs just enough for the plugin.
const staticDiscovery = {
  getBaseUrl: async (id) => (id === 'costscope' ? 'http://localhost:7007/api/costscope' : ''),
};
const identityApi = {
  getUserId: async () => 'user',
  getProfileInfo: async () => ({}),
  getCredentials: async () => ({ token: undefined }),
};
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

// Minimal ApiHolder compatible with ApiProvider
const featureFlagsApi = new LocalStorageFeatureFlags();
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

function EnsureProject({ children }) {
  const loc = useLocation();
  const nav = useNavigate();
  React.useEffect(() => {
    const url = new URL(loc.pathname + loc.search, 'http://localhost');
    if (loc.pathname === '/costscope' && !url.searchParams.has('project')) {
      url.searchParams.set('project', 'demo');
      nav(`${url.pathname}${url.search}`, { replace: true });
    }
  }, [loc.pathname, loc.search, nav]);
  return children;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ApiProvider apis={apis}>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route path="/" element={<Navigate to="/costscope" replace />} />
            <Route path="*" element={<Navigate to="/costscope" replace />} />
            <Route
              path="/costscope"
              element={
                <div data-testid="costscope-page-wrapper">
                  <EnsureProject>
                    <CostscopePage />
                  </EnsureProject>
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
