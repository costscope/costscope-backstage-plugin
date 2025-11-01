// Delegate to repo-level babel.config.cjs so tests run from package root pick up the same presets
module.exports = require('../../babel.config.cjs');
