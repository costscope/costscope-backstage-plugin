// Lightweight browser-friendly mock client for the Costscope API used by the demo SPA.
// This mirrors the behavior of the internal testing utility but is self-contained
// so the minimal app can build statically without relying on the plugin's test exports.

function daysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10); // yyyy-mm-dd
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

export function buildMockOverview(days = 30) {
  const base = 120; // base daily cost
  const trend = 0.8; // per-day trend up
  const amp = 25; // seasonal amplitude
  const res = [];
  for (let i = days - 1; i >= 0; i--) {
    const x = days - 1 - i;
    const seasonal = Math.sin((x / 7) * Math.PI * 2) * amp;
    const cost = round2(base + x * trend + seasonal + 40); // keep positive and bouncy
    res.push({ date: daysAgoISO(i), cost });
  }
  return res;
}

export function buildMockBreakdown() {
  const labels = ['Compute', 'Storage', 'Network', 'Database', 'Other'];
  const weights = [0.42, 0.25, 0.12, 0.16, 0.05];
  return labels.map((dim, idx) => ({
    dim,
    cost: round2(350 * weights[idx]),
    deltaPct: round2((idx % 2 === 0 ? 1 : -1) * (5 + idx * 2)),
  }));
}

export function buildMockAlerts() {
  return [
    { id: 'ai-1', severity: 'warn', message: 'S3 lifecycle policy missing for 3 buckets' },
    { id: 'ai-2', severity: 'info', message: 'RDS instance rightsized automatically' },
    { id: 'ai-3', severity: 'critical', message: 'Unusually high data transfer costs detected' },
  ];
}

export function buildMockSummary(overview) {
  const totalCost = round2(overview.reduce((s, o) => s + (o.cost || 0), 0));
  const previousTotalCost = round2(totalCost * 0.92);
  const deltaPct =
    previousTotalCost === 0
      ? 0
      : round2(((totalCost - previousTotalCost) / previousTotalCost) * 100);
  return { period: 'P30D', totalCost, previousTotalCost, deltaPct, currency: 'USD' };
}

export function buildMockProviders() {
  return [
    { id: 'aws', name: 'Amazon Web Services', status: 'ok' },
    { id: 'gcp', name: 'Google Cloud', status: 'ok' },
    { id: 'azure', name: 'Microsoft Azure', status: 'degraded' },
  ];
}

export function buildMockDatasets() {
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
  ];
}

export function buildMockHealth() {
  return { status: 'ok' };
}

/**
 * Create a mock API compatible with the plugin's CostscopeApi interface.
 * Optional overrides allow tweaking any method; opts.latencyMs adds artificial delay.
 */
export function createMockCostscopeApi(overrides = {}, opts = { latencyMs: 0 }) {
  const overview = buildMockOverview();
  const breakdown = buildMockBreakdown();
  const alerts = buildMockAlerts();
  const summary = buildMockSummary(overview);
  const providers = buildMockProviders();
  const datasets = buildMockDatasets();
  const latency = Math.max(0, opts?.latencyMs ?? 0);

  function maybeDelay(value) {
    if (!latency) return Promise.resolve(value);
    return new Promise((resolve) => setTimeout(() => resolve(value), latency));
  }

  const base = {
    async getOverview() {
      return maybeDelay(overview);
    },
    async getBreakdown() {
      return maybeDelay(breakdown);
    },
    async getActionItems() {
      return maybeDelay(alerts);
    },
    async getSummary() {
      return maybeDelay(summary);
    },
    async getProviders() {
      return maybeDelay(providers);
    },
    async getDatasets() {
      return maybeDelay(datasets);
    },
    async searchDatasets(params = {}) {
      const res = datasets.filter(
        (d) =>
          (!params.provider || params.provider.split(',').includes(d.provider)) &&
          (!params.status || d.status === params.status),
      );
      return maybeDelay(res);
    },
    async health() {
      return maybeDelay(buildMockHealth());
    },
    async prefetchAll() {
      const t0 =
        typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      const out = {
        overview,
        breakdown,
        alerts,
        summary,
        providers,
        datasets,
        correlationId: 'mock-client',
        durationMs: 0,
      };
      const t1 =
        typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      out.durationMs = Math.max(0, Math.round(t1 - t0 + latency));
      return maybeDelay(out);
    },
    invalidateCache() {
      /* no-op */
    },
  };

  return { ...base, ...(overrides || {}) };
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
