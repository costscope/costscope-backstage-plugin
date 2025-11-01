import { UseDatasetsSearchParams } from './useDatasetsSearch';
/**
 * Backwards-compatible singular alias for useDatasetsSearch (task requirement wording).
 * Prefer useDatasetsSearch internally; this remains a thin wrapper so tree-shaking keeps
 * only one implementation. Publicly exported for ergonomic parity with other singular hooks.
 */
export declare function useDatasetSearch(params: UseDatasetsSearchParams): import("@tanstack/react-query").UseQueryResult<{
    id: string;
    provider: string;
    project: string;
    status: string;
    records: number;
    periodStart: string;
    periodEnd: string;
    lastIngestedAt?: string | undefined;
}[], Error>;
export type { UseDatasetsSearchParams as UseDatasetSearchParams };
