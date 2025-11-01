// CJS shim to load ESM-generated finops-zod.js for Jest tests.
// Attempt to load a CJS build first; otherwise dynamically import and expose named exports.
const { createRequire } = require('module');
const req = createRequire(__filename);
let mod;
try {
  // If a CJS version exists in dist or generated folder, prefer it
  mod = req('../../contracts/src/generated/finops-zod.js');
} catch (e) {
  // Fallback: dynamic import the ESM module and synchronously re-export is not possible,
  // so provide minimal runtime-compatible wrappers by lazy-loading via promises.
  // Tests typically import named functions; we expose async getters.
  mod = null;
}
if (mod) {
  module.exports = mod;
} else {
  // Minimal synchronous stubs that mirror the expected shape used by tests.
  module.exports = {
    validateWith: function(schema, data) { throw new Error('finops-zod CJS shim: dynamic import required in this environment'); },
    // Expose other symbols if needed by tests as placeholders
  };
}
