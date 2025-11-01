import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Ensure singletons for React and Backstage core packages to avoid context/ref duplication
    dedupe: ['react', 'react-dom', '@backstage/core-app-api', '@backstage/core-plugin-api'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@mui/material', '@tanstack/react-query', 'recharts'],
  },
});
