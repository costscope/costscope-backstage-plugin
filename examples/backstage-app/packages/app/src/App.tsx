import { createApp } from '@backstage/app-defaults';
import { FlatRoutes } from '@backstage/core-app-api';
import {
  SidebarPage,
  Sidebar,
  SidebarGroup,
  SidebarItem,
  SidebarDivider,
  Content,
  Header,
  Page,
} from '@backstage/core-components';
import { CostscopePage } from '@costscope/backstage-plugin';
import SvgIcon from '@mui/material/SvgIcon';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import { Route, Navigate } from 'react-router-dom';

import { apis } from './apis';

// Create app without feature array (mount page directly via route)
const app = createApp({ apis });
const queryClient = new QueryClient();

// ...no debug globals (cleanup)

const AppProvider = app.getProvider();
const AppRouter = app.getRouter();

// Small header title component (no external links in example playground)
const HeaderTitle = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
    }}
  >
    <span style={{ color: 'white', fontWeight: 700 }}>Costscope</span>
  </div>
);

export const App = () => (
  // Intentionally lightweight debug via build-time logger elsewhere; don't call console here.
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <AppRouter>
        <SidebarPage>
          <Sidebar>
            <SidebarGroup label="Navigation">
              <SidebarItem
                icon={() => (
                  <span
                    style={{
                      fontSize: 16,
                      lineHeight: '16px',
                      display: 'inline-block',
                      fontWeight: 600,
                    }}
                    aria-hidden
                  >
                    🏠
                  </span>
                )}
                to="/catalog"
                text="Catalog"
              />
              <SidebarItem
                icon={() => (
                  <span
                    style={{
                      fontSize: 16,
                      lineHeight: '16px',
                      display: 'inline-block',
                      fontWeight: 600,
                    }}
                    aria-hidden
                  >
                    📚
                  </span>
                )}
                to="/api-docs"
                text="APIs"
              />
              <SidebarItem
                icon={() => (
                  <span
                    style={{
                      fontSize: 16,
                      lineHeight: '16px',
                      display: 'inline-block',
                      fontWeight: 600,
                    }}
                    aria-hidden
                  >
                    ₵
                  </span>
                )}
                to="/costscope"
                text="Costscope"
              />
            </SidebarGroup>
            <SidebarDivider />
            <SidebarGroup label="Settings">
              <SidebarItem
                icon={() => (
                  <span
                    style={{
                      fontSize: 16,
                      lineHeight: '16px',
                      display: 'inline-block',
                      fontWeight: 600,
                    }}
                    aria-hidden
                  >
                    ⚙️
                  </span>
                )}
                to="/settings"
                text="Settings"
              />
            </SidebarGroup>
          </Sidebar>
          <FlatRoutes>
            {/* Redirect root to /costscope for demo convenience */}
            <Route path="/" element={<Navigate to="/costscope" replace />} />
            <Route
              path="/costscope"
              element={
                <Page themeId="tool">
                  <Header title={<HeaderTitle />} />
                  <Content>
                    <CostscopePage />
                  </Content>
                </Page>
              }
            />
          </FlatRoutes>
        </SidebarPage>
      </AppRouter>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
