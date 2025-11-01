// Test-friendly CommonJS wrapper: re-export the TypeScript source so Jest/ts-jest
// can require the module without hitting ESM-only syntax during collection/runtime.
// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = require('./finops-zod.ts');
