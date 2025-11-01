import { defineConfig } from 'vite';

export default defineConfig({
  // Ensure esbuild targets a modern environment so named exports that are strings
  // (e.g. "some.key.name") produced by the plugin's dist files are supported
  esbuild: {
    target: 'esnext',
    jsx: 'automatic',
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    target: 'esnext',
  },
});
