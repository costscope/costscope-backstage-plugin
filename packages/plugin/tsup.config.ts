import { defineConfig } from 'tsup';

const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  target: 'es2022',
  // Minify only in production to aid DCE and reduce bundle size
  minify: isProd,
  // Ensure we don’t bundle host app peers
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    'recharts',
    // Ensure Backstage core packages are not bundled to avoid duplicate singletons
    // that break apiRef identity checks in host apps (e.g., featureFlagsApiRef)
    '@backstage/core-app-api',
    '@backstage/core-plugin-api',
    '@backstage/plugin-catalog-react',
    '@tanstack/react-query',
    '@mui/material',
    '@mui/icons-material',
    '@mui/utils',
  ],
  esbuildOptions: (opts) => {
    // Drop console in production builds; safe since plugin already forbids runtime console in src
    if (isProd) (opts as any).drop = ['console'];
  },
});
