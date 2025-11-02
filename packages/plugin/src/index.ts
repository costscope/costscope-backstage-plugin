//
/**
 * @packageDocumentation
 * Curated public API surface for the Costscope Backstage plugin.
 * All exports in this file are considered stable (subject to semver) unless otherwise documented.
 *
 * This root entrypoint intentionally re-exports from './public' to keep a clean facade.
 */
// Avoid importing JSON in type surface to keep API Extractor happy.
// This constant should reflect package.json version during releases.
/** @public */
export const PLUGIN_VERSION = '0.1.1' as const;

// NOTE: Explicit import of the page component to ensure bundlers (tsup + esbuild) retain the symbol.
// Relying solely on a re-export chain caused the `CostscopePage` value export to be tree-shaken in the
// published ESM bundle (showing a runtime warning when classic routing imported it). Importing here
// guarantees inclusion without impacting size materially.
// Force side-effect retention of page component; assign to local then re-export to defeat aggressive tree-shaking.
import { CostscopePage as _CostscopePage } from './components/pages/CostscopePage';
// build-consts intentionally not imported here to avoid side-effects in the root entry
export {
  // Plugin root (extension stubs removed)
  costscope,
  // Client & API refs / types
  CostscopeClient,
  costscopeApiRef,
  type CostscopeApi,
  type Overview,
  type BreakdownRow,
  type ActionItem,
  type Summary,
  type ProviderInfo,
  type DatasetMeta,
  type DatasetSearchRow,
  type DatasetSearchParams,
  type Healthz,
  type CostscopeClientOptions,
  createCostscopeClient,
  // Formatting provider & hook
  FormattingProvider,
  useFormatting,
  type FormattingContextValue,
  // Hooks
  useProjectAnnotation,
  usePrefetchedCostscopeData,
  useRetryTelemetry,
  useCacheEvents,
  usePrefetchOnVisibility,
  useProgressiveHydration,
  hydrateFromManifest,
  readManifestFromDocument,
  type CostscopePrefetchManifest,
  useProviders,
  useDatasetsSearch,
  type UseDatasetsSearchParams,
  useDatasetSearch,
  useDatasets,
  useTopBreakdown,
  type UseTopBreakdownParams,

  // Constants / config helpers
  DEFAULT_PERIOD,
  DEFAULT_BREAKDOWN_DIMENSION,
  CURRENCY,
  PROJECT_ANNOTATION,
  PROJECT_QUERY_PARAM,
  DEFAULT_SERVICE_ID,
  resolveServiceId,
  // Utilities
  buildPath,
  withProjectParam,
  CriticalProfiles,
  // Errors & guards
  CostscopeErrorCodes,
  type CostscopeErrorCode,
  isCostscopeError,
  type CostscopeError,
  // Telemetry types
  type CacheEvent,
  // Components
  CostDriversCard,
  // UI icons (small inline variants)
  WorkspacePremiumSmall,
  GitHubSmall,
  type CostDriversCardProps,
  DatasetSearchPageLazy,
} from './public';

// Re-export i18n helpers from the public surface so host apps (examples) can consume translations
export { I18nProvider, useI18n } from './i18n';
export type { I18nContextValue } from './i18n';
// Re-export select contract types referenced in our public type signatures so API Extractor
// includes them in the entry point and avoids forgotten-export diagnostics.
export type { paths, components } from '@costscope/contracts';

// Explicit value export for direct component usage in classic Backstage apps
/** @public */
export const CostscopePage = _CostscopePage;

// E2E runtime probe: log when this module is evaluated in the browser/runtime.
// This is intentionally a tiny, low-risk side-effect so automated checks can
// deterministically detect which plugin bundle is loaded by the example app.
try {
  // Short unique probe token: CSPWG1
  // Keep the check as a plain `process.env.NODE_ENV !== 'production'` so the bundler
  // (esbuild via tsup) can replace `process.env.NODE_ENV` at build-time. When defined
  // to the literal "production" this becomes `"production" !== 'production'` and is
  // dead-code-eliminated from production bundles.
  // dev-only probe removed for production builds
} catch (e) {
  // Intentionally ignore any logging errors in exotic runtimes.
}

// Export plugin version for host diagnostics.
// (exported above as a const)
