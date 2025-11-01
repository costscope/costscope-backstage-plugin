import type {
  CostscopeApi,
  Overview,
  BreakdownRow,
  ActionItem,
  Summary,
  ProviderInfo,
  DatasetMeta,
  DatasetSearchRow,
  DatasetSearchParams,
  Healthz,
} from '../types';

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  // yyyy-mm-dd
  return d.toISOString().slice(0, 10);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function buildMockOverview(days = 30): Overview[] {
  const base = 120; // base daily cost
  const trend = 0.8; // per-day trend up
  const amp = 25; // seasonal amplitude
  const res: Overview[] = [] as any;
  for (let i = days - 1; i >= 0; i--) {
    const x = days - 1 - i;
    const seasonal = Math.sin((x / 7) * Math.PI * 2) * amp;
    const cost = round2(base + x * trend + seasonal + 40); // keep positive and bouncy
    res.push({ date: daysAgoISO(i), cost } as any);
  }
  return res;
}

export function buildMockBreakdown(): BreakdownRow[] {
  // Simple split that roughly matches last overview point
  const labels = ['Compute', 'Storage', 'Network', 'Database', 'Other'];
  const weights = [0.42, 0.25, 0.12, 0.16, 0.05];
  return labels.map((dim, idx) => ({
    dim,
    cost: round2(350 * weights[idx]),
    deltaPct: round2((idx % 2 === 0 ? 1 : -1) * (5 + idx * 2)),
  })) as any;
}

export function buildMockAlerts(): ActionItem[] {
  return [
    { id: 'ai-1', severity: 'warn', message: 'S3 lifecycle policy missing for 3 buckets' },
    { id: 'ai-2', severity: 'info', message: 'RDS instance rightsized automatically' },
    { id: 'ai-3', severity: 'critical', message: 'Unusually high data transfer costs detected' },
  ] as any;
}

export function buildMockSummary(overview: Overview[]): Summary {
  const totalCost = round2(overview.reduce((s, o: any) => s + (o.cost || 0), 0));
  const previousTotalCost = round2(totalCost * 0.92);
  const deltaPct =
    previousTotalCost === 0
      ? 0
      : round2(((totalCost - previousTotalCost) / previousTotalCost) * 100);
  return {
    period: 'P30D',
    totalCost,
    previousTotalCost,
    deltaPct,
    currency: 'USD',
  } as any;
}

export function buildMockProviders(): ProviderInfo[] {
  return [
    { id: 'aws', name: 'Amazon Web Services', status: 'ok' },
    { id: 'gcp', name: 'Google Cloud', status: 'ok' },
    { id: 'azure', name: 'Microsoft Azure', status: 'degraded' },
  ] as any;
}

export function buildMockDatasets(): DatasetMeta[] {
  const today = daysAgoISO(0);
  const aWeekAgo = daysAgoISO(7);
  const twoWeeksAgo = daysAgoISO(14);
  const threeWeeksAgo = daysAgoISO(21);
  return [
    {
      id: 'ds-001',
      provider: 'aws',
      periodStart: threeWeeksAgo,
      periodEnd: today,
      records: 125000,
      status: 'ready',
    },
    {
      id: 'ds-002',
      provider: 'gcp',
      periodStart: twoWeeksAgo,
      periodEnd: today,
      records: 83000,
      status: 'ready',
    },
    {
      id: 'ds-003',
      provider: 'azure',
      periodStart: aWeekAgo,
      periodEnd: today,
      records: 42000,
      status: 'processing',
    },
    {
      id: 'ds-004',
      provider: 'aws',
      periodStart: twoWeeksAgo,
      periodEnd: aWeekAgo,
      records: 69000,
      status: 'archived',
    },
    {
      id: 'ds-005',
      provider: 'gcp',
      periodStart: threeWeeksAgo,
      periodEnd: twoWeeksAgo,
      records: 57000,
      status: 'archived',
    },
  ] as any;
}

export function buildMockHealth(): Healthz {
  return { status: 'ok' } as any;
}

/**
 * Create a browser-friendly mock implementation of CostscopeApi.
 * Optional overrides allow tests/stories to customize any method.
 */
export function createMockCostscopeApi(
  overrides?: Partial<CostscopeApi>,
  opts?: { latencyMs?: number },
): CostscopeApi {
  const overview = buildMockOverview();
  const breakdown = buildMockBreakdown();
  const alerts = buildMockAlerts();
  const summary = buildMockSummary(overview);
  const providers = buildMockProviders();
  const datasets = buildMockDatasets();
  const latency = Math.max(0, opts?.latencyMs ?? 0);

  function maybeDelay<T>(value: T): Promise<T> {
    if (!latency) return Promise.resolve(value);
    return new Promise<T>((resolve) => setTimeout(() => resolve(value), latency));
  }

  const base: CostscopeApi = {
    async getOverview() {
      return maybeDelay(overview as any);
    },
    async getBreakdown() {
      return maybeDelay(breakdown as any);
    },
    async getActionItems() {
      return maybeDelay(alerts as any);
    },
    async getSummary() {
      return maybeDelay(summary as any);
    },
    async getProviders() {
      return maybeDelay(providers as any);
    },
    async getDatasets() {
      return maybeDelay(datasets as any);
    },
    async searchDatasets(params: DatasetSearchParams = {}) {
      const res: DatasetSearchRow[] = (datasets as any).filter(
        (d: any) =>
          (!params.provider || params.provider.split(',').includes(d.provider)) &&
          (!params.status || d.status === params.status),
      );
      return maybeDelay(res as any);
    },
    async health() {
      return maybeDelay(buildMockHealth());
    },
    async prefetchAll() {
      const t0 = performance.now?.() ?? Date.now();
      const out = {
        overview: overview as any,
        breakdown: breakdown as any,
        alerts: alerts as any,
        summary: summary as any,
        providers: providers as any,
        datasets: datasets as any,
        correlationId: 'mock-client',
        durationMs: 0,
      };
      const t1 = performance.now?.() ?? Date.now();
      (out as any).durationMs = Math.max(0, Math.round(t1 - t0 + latency));
      return maybeDelay(out);
    },
    invalidateCache() {
      // no-op in mock
    },
  } as CostscopeApi;

  return { ...(base as any), ...(overrides || {}) } as CostscopeApi;
}

export const __mockData = {
  buildMockOverview,
  buildMockBreakdown,
  buildMockAlerts,
  buildMockSummary,
  buildMockProviders,
  buildMockDatasets,
  buildMockHealth,
};
