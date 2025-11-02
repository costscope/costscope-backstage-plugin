import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Ensure singletons for React and Backstage core packages to avoid context/ref duplication
    dedupe: ['react', 'react-dom', '@backstage/core-app-api', '@backstage/core-plugin-api'],
  },
  // Ensure esbuild targets a modern environment so named exports that are strings
  // (e.g. "some.key.name") produced by the plugin's dist files are supported
  esbuild: {
    target: 'esnext',
    jsx: 'automatic',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@mui/material', '@tanstack/react-query', 'recharts'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    target: 'esnext',
  },
});
