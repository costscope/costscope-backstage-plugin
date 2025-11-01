// CJS shim for @backstage/core-plugin-api used in Jest tests.
// Some Backstage packages ship only ESM builds. Pointing Jest imports to this
// CJS shim avoids parse-time ESM errors during test collection.
const { createRequire } = require('module');
const requireFromCwd = createRequire(require.resolve('../../../../package.json'));
// Load the ESM build via Node dynamic import, but surface a synchronous CJS-like
// API by requiring the already-built dist file via require from the package dir
// which contains CJS-compatible exports (if present). If not present, fallback
// to loading the ESM and mapping the needed exports.
let core;
try {
  core = requireFromCwd('@@backstage/core-plugin-api/dist/index.cjs');
} catch (e) {
  // Fallback: import the ESM entry and map exports later (async). For tests we
  // only need a few helpers; we'll map them lazily if required.
  core = null;
}

// Helper to lazily load ESM if needed.
const loadEsm = async () => {
  if (core) return core;
  const esmPath = requireFromCwd('@backstage/core-plugin-api/dist/index.esm.js');
  // dynamic import returns namespace object
  const ns = await import(esmPath);
  return ns;
};

// Export minimal sync APIs Jest test code expects. If ESM fallback is needed,
// callers in tests will still be able to call useApi etc via runtime mocks.
module.exports = {
  // createApiRef – commonly used synchronously in the plugin source
  createApiRef: function(opts) {
    // If core is already available and provides createApiRef, use it.
    if (core && core.createApiRef) return core.createApiRef(opts);
    // Otherwise return a simple minimal ApiRef-like object for test-time use.
    return { id: opts && opts.id ? opts.id : 'test.api.ref', __test: true };
  },
  // Export placeholders for named refs used in tests; tests often require analyticsApiRef
  analyticsApiRef: { id: 'analytics.test.api' },
  // Provide a benign useApi stub for runtime tests; real tests usually mock this module
  useApi: function() {
    return {};
  },
};
