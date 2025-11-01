// CommonJS re-export for Jest integration tests to avoid TS syntax parsing issues.
// Compiles after tsc, but during ts-jest run we can require this file which in turn
// requires the TypeScript module through ts-node transpilation.
module.exports = require('./server.ts');
