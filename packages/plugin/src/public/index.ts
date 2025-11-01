// Curated public API (explicit exports – no wildcard re-exports)
// Plugin root (no extension stubs)
export { costscope } from './plugin';
export { CostscopePage } from '../components/pages/CostscopePage';

// Client & API refs / types
export {
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
} from '../client';
export { createCostscopeClient } from '../client/createClient';

// Formatting provider & hook
export { FormattingProvider, useFormatting, type FormattingContextValue } from '../formatting';

// Hooks (public)
export { useProjectAnnotation } from '../client/hooks';
export { usePrefetchedCostscopeData } from '../client/hooks';
export { useRetryTelemetry } from '../client/hooks';
export { useCacheEvents } from '../client/hooks';
export { usePrefetchOnVisibility } from '../client/hooks';
export { useProgressiveHydration } from '../client/hooks';
export { useProviders } from '../client/hooks';
export { useDatasetsSearch, type UseDatasetsSearchParams } from '../client/hooks';
export { useDatasetSearch } from '../client/hooks';
export { useDatasets } from '../client/hooks';
export { useTopBreakdown, type UseTopBreakdownParams } from '../client/hooks/useTopBreakdown';
export {
  hydrateFromManifest,
  readManifestFromDocument,
  type CostscopePrefetchManifest,
} from '../ssr/hydration';
// Charts
export { CostOverviewCard } from '../components/widgets/charts/CostOverviewCard';
export { ChargeCategoryDonut } from '../components/widgets/charts/ChargeCategoryDonut';
// Cards / lists
export {
  CostDriversCard,
  type CostDriversCardProps,
} from '../components/widgets/cards/CostDriversCard';
// Lazy pages
export { DatasetSearchPageLazy } from '../lazy/DatasetSearchPageLazy';

// Constants / config helpers
export {
  DEFAULT_PERIOD,
  DEFAULT_BREAKDOWN_DIMENSION,
  CURRENCY,
  PROJECT_ANNOTATION,
  PROJECT_QUERY_PARAM,
  DEFAULT_SERVICE_ID,
  resolveServiceId,
} from '../constants';

// Utility helpers (export directly from centralized utils)
export { buildPath } from '../utils/path';
export { withProjectParam } from '../utils/project';
export { CriticalProfiles } from '../utils/criticalProfiles';

// Error codes & guards
export { CostscopeErrorCodes, type CostscopeErrorCode } from '../constants/errors';
export { isCostscopeError } from '../client/core/errors';
export type { CostscopeError } from '../client/core/errors';

// Telemetry types
export type { CacheEvent } from '../client/telemetry/retryTelemetry';
// UI icons (small inline variants)
export { WorkspacePremiumSmall } from '../components/ui/Icons';
export { GitHubSmall } from '../components/ui/Icons';

// Testing / demo utilities (browser-friendly mocks)
export { createMockCostscopeApi } from '../testing/costscopeClientMock';
