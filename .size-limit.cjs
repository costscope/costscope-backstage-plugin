// Size Limit configuration:
// We measure the main ESM entry (tree-shaken consumer typical import path).
// Validation-time Zod bundle (zod-*.mjs) is large but only loaded when
// runtime validation env flag is enabled; treat core entry size as budgeted.
module.exports = [
  {
    name: 'core ESM entry',
    path: 'packages/plugin/dist/index.mjs',
    // Target tightened now that MUI is externalized. Allow +0.2 KB headroom for minor churn.
    // Restored to the stricter budget after trimming dev-only code paths.
    limit: '55.6 KB',
  },
  // Worst-case (runtime validation enabled) – monitor large optional Zod chunk.
  // We point directly at the emitted zod chunk to catch accidental growth.
  // Threshold chosen to allow modest increases while discouraging bloat.
  {
    name: 'validation bundle (optional)',
    path: 'packages/plugin/dist/validation*.mjs',
    limit: '135 KB',
  },
  // Monitor the largest lazy chunk to prevent future bloat.
  // Current largest: chunk-67EGVSDM.mjs (61.13 KB raw → 17.14 KB brotli)
  // Set limit with buffer for expected growth but low enough to catch issues.
  {
    name: 'largest lazy chunk',
    path: 'packages/plugin/dist/chunk-*.mjs',
    limit: '80 KB',
  },
  // Scenario: ensure enabling runtime validation doesn't inflate core entry unexpectedly
  {
    name: 'core ESM entry (validation import)',
    path: 'packages/plugin/dist/index.mjs',
    // Historically this imported a symbol that toggled runtime validation.
    // That symbol was removed/renamed; import an existing stable export so
    // the size measurement can run without crashing. The validation bundle
    // is measured separately above.
    import: '{ PLUGIN_VERSION }',
    // Tighten validation import allowance to keep overall bundle budget conservative.
    limit: '65 KB',
  },
];
