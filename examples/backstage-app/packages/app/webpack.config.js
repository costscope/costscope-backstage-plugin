// Force single React/ReactDOM instance by aliasing to the root install.
// This avoids duplicate dispatcher when the plugin ships with a nested node_modules/react.
const path = require('path');

/** @param {import('webpack').Configuration} config */
module.exports = (config) => {
  config.resolve = config.resolve || {};
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    react: path.resolve(__dirname, '../../../../node_modules/react'),
    'react-dom': path.resolve(__dirname, '../../../../node_modules/react-dom'),
    // Ensure the example app (and any symlinked plugin in workspaces) reuses the
    // single workspace copy of @tanstack/react-query to avoid duplicate context
    // instances which lead to "No QueryClient set" runtime errors when a
    // plugin and host bundle different copies.
    '@tanstack/react-query': path.resolve(__dirname, '../../../../node_modules/@tanstack/react-query'),
  };

  // Ensure the webpack dev server client (HMR websocket) connects to the
  // port used to start the example (process.env.PORT). This is useful when
  // running inside devcontainers where the container's 3000 may be mapped to
  // a different host port (e.g. 3001). The setting is intentionally small and
  // reversible — it only affects dev server client options.
  config.devServer = config.devServer || {};
  // Forward API calls to the local mock-backend proxy (7008). This ensures
  // /api/* is never served by the SPA fallback (index.html) and works even when
  // the backend port is only reachable inside the devcontainer.
  const backendBase = process.env.BACKEND_BASE_URL || 'http://localhost:7008';
  config.devServer.proxy = {
    ...(config.devServer.proxy || {}),
    '/api': {
      target: backendBase,
      changeOrigin: true,
      secure: false,
      pathRewrite: { '^/api': '/api' },
      // logLevel: 'debug',
    },
  };
  return config;
};
