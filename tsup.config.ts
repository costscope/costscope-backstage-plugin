import { defineConfig } from 'tsup';

// tsup uses esbuild under the hood and supports esbuild define for replacing globals at build time.
// We provide a conservative mapping that replaces common Node-style access patterns used in the code.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  outDir: 'dist',
  clean: true,
  // Minify production bundles to aid DCE of dev-only branches and reduce size
  minify: true,
  sourcemap: true,
  external: ['react', 'react-dom', 'react/jsx-runtime', 'recharts', '@backstage/plugin-catalog-react'],
  esbuildOptions: (ctx) => {
    ctx.define = {
      // standard NODE_ENV usage
      'process.env.NODE_ENV': '"production"',
      // convenience boolean for DCE in source files
      '__DEV': 'false',
    } as any;
    // Instruct esbuild to drop console.* calls during minification
    // This helps remove leftover console.* bodies that reference dev-only logging.
    (ctx as any).drop = ['console'];
  },
});
