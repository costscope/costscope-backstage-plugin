// Centralized React Query keys
// Pattern: [DEFAULT_SERVICE_ID, domain, ...params]
import { DEFAULT_SERVICE_ID } from '../constants';

export const qk = {
  overview: (period: string, project?: string) =>
    [DEFAULT_SERVICE_ID, 'overview', period, project || ''] as const,
  breakdown: (group: string, period: string, project?: string) =>
    [DEFAULT_SERVICE_ID, 'breakdown', group, period, project || ''] as const,
  summary: (period: string, project?: string) =>
    [DEFAULT_SERVICE_ID, 'summary', period, project || ''] as const,
  actionItems: (project?: string) => [DEFAULT_SERVICE_ID, 'actionItems', project || ''] as const,
  // Placeholder mutation-related key example
  dismissActionItem: (id: string) => [DEFAULT_SERVICE_ID, 'actionItems', 'dismiss', id] as const,
  providers: () => [DEFAULT_SERVICE_ID, 'providers'] as const,
  datasets: (project?: string) => [DEFAULT_SERVICE_ID, 'datasets', project || ''] as const,
  datasetsSearch: (params: {
    project?: string; provider?: string; status?: string; from?: string; to?: string;
    minRecords?: number; maxRecords?: number; limit?: number;
  }) => [
    DEFAULT_SERVICE_ID,
    'datasetsSearch',
    params.project || '',
    params.provider || '',
    params.status || '',
    params.from || '',
    params.to || '',
    params.minRecords ?? '',
    params.maxRecords ?? '',
    params.limit ?? '',
  ] as const,
};

export type QueryKey =
  | ReturnType<typeof qk.overview>
  | ReturnType<typeof qk.breakdown>
  | ReturnType<typeof qk.summary>
  | ReturnType<typeof qk.actionItems>
  | ReturnType<typeof qk.dismissActionItem>;
