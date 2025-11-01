/* global process */
// A small module that exposes build-time constants. Importing `__DEV` from here
// makes it easier for the bundler (esbuild via tsup) to inline the value across
// modules when `process.env.NODE_ENV` is defined at build time.
export const __DEV = process.env.NODE_ENV !== 'production';

export default __DEV;
