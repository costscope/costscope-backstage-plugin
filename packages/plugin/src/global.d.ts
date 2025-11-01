// Declares global build-time constants injected by the bundler (esbuild via tsup)
// `__DEV` is defined in `tsup.config.ts` via esbuild define and will be replaced
// with a boolean literal at build time.
declare const __DEV: boolean;
export {};
