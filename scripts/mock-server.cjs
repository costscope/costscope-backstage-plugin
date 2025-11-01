// Lightweight runner to start the TS mock server under Node (CJS) reliably.
// Ensures ts-node's require hook is registered before loading the TS entry.
// Used by tests and the `yarn mock` script.

// Register ts-node in transpile-only mode for speed
require('ts-node/register/transpile-only');

// Load the TypeScript server and re-export the created http.Server instance.
module.exports = require('./mock-server.ts');
