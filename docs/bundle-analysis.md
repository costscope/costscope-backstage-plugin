# Bundle Analysis

Use this when you need a deeper breakdown than the size‑limit summary (e.g. identifying an unexpectedly large transitive dependency or verifying tree‑shaking of optional code paths).

## Quick Analysis

Builds a temporary single-file bundle with source maps and opens a static HTML report:

```bash
yarn analyze
```

### Outputs

- Creates a one-off analysis bundle in `dist-analyze/index.mjs` (not identical to the published multi-chunk build; it's flattened for inspection only).
- Inlines SVG assets as data URLs (esbuild `--loader:.svg=dataurl`).
- Generates `dist-analyze/bundle-analyze.html` (interactive treemap) via `source-map-explorer` plus a size table to stdout.

### Viewing Results

Open the HTML file in your browser for an interactive treemap (collapse / explore nested modules). In a Dev Container you can run:

```bash
$BROWSER dist-analyze/bundle-analyze.html
```

## Guidelines

- **Focus on the ESM analysis bundle** (`dist-analyze/index.mjs`); Backstage apps at runtime load the optimized split ESM build in `dist/`.
- **Evaluate large dependencies**: If a single dependency dominates (>30% gzip) evaluate if it is truly required at runtime or can be lazy‑loaded.
- **Prefer explicit imports**: Use `import { SpecificThing } from 'lib'` over default/barrel imports that may pull whole libraries.
- **Measure deltas**: When adding a new library, run `yarn analyze` before and after to capture the delta (commit the HTML only for benchmarking experiments – do NOT check it in normally).

## Advanced Usage

### Comparing Commits

If you need a diff between two commits: build each commit and compare the `source-map-explorer --json` outputs (script enhancement welcome – open an issue).

### Text-only Inspection

For a fast textual only inspection (without regenerating HTML) you can run:

```bash
source-map-explorer 'dist-analyze/index.mjs'
```

## Important Notes

The regular size budget enforcement still lives in `.size-limit.cjs`; this analysis bundle is for ad‑hoc deeper dives and may slightly differ (e.g., inlined assets, disabled lazy chunks). Use it for directional decisions, not exact publish size (use `yarn size` for enforcement).
