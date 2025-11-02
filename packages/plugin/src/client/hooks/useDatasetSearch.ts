import { useDatasetsSearch, UseDatasetsSearchParams } from './useDatasetsSearch';

/**
 * Backwards-compatible singular alias for useDatasetsSearch (task requirement wording).
 * Prefer useDatasetsSearch internally; this remains a thin wrapper so tree-shaking keeps
 * only one implementation. Publicly exported for ergonomic parity with other singular hooks.
 * @public
 */
export function useDatasetSearch(params: UseDatasetsSearchParams) {
  return useDatasetsSearch(params);
}

/** @public */
export type { UseDatasetsSearchParams as UseDatasetSearchParams };
