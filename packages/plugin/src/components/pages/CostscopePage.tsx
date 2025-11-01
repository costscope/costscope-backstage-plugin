// Order: external libs first, then internal modules (maintain lint grouping)
import { analyticsApiRef, useApi } from '@backstage/core-plugin-api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';

import { __DEV } from '../../build-consts';
import { isCostscopeError } from '../../client';
// PLUGIN_VERSION import after i18n to satisfy grouping (moved below)
import { usePrefetchedCostscopeData } from '../../client/hooks';
import { DEFAULT_SERVICE_ID } from '../../constants';
import { CostscopeErrorCodes } from '../../constants/errors';
import { BreakdownTable } from '../../features/costs/tables/BreakdownTable';
import { FormattingProvider } from '../../formatting';
import { I18nProvider, useI18n, I18nContext } from '../../i18n';
import { PLUGIN_VERSION } from '../../index';
import { qk } from '../../queryKeys';
import { info as logInfo } from '../../utils/logger';
import { error as logError } from '../../utils/logger';
import { FiltersBar, GroupBy, PeriodPreset } from '../controls/FiltersBar';
import { CacheEventsPanel } from '../dev/CacheEventsPanel';
import { LiteInfoCard } from '../ui/LiteInfoCard';
import { CostDriversCard } from '../widgets/cards/CostDriversCard';
import { CostSummaryHeader } from '../widgets/cards/CostSummaryHeader';
import { DatasetFreshnessCard } from '../widgets/cards/DatasetFreshnessCard';
import { ChargeCategoryDonut } from '../widgets/charts/ChargeCategoryDonut';
import { CostOverviewCard } from '../widgets/charts/CostOverviewCard';
import { TopServices } from '../widgets/lists/TopServices';
import { ActionItemsPanel } from '../widgets/panels/ActionItemsPanel';
import { ProvidersPanel } from '../widgets/panels/ProvidersPanel';

// Local error boundary (page scoped) to avoid hard-crashing the Backstage app shell
// when an internal widget render/logic error occurs. Provides a simple reload UX.
class LocalErrorBoundary extends React.Component<{ children: React.ReactNode }, { error?: Error }> {
  static contextType = I18nContext;
  constructor(props: any) {
    super(props);
    this.state = { error: undefined };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: any) {
    // Intentionally lightweight; could integrate errorApi if desired in future.
    logError('[costscope-backstage-plugin] Uncaught error in CostscopePage subtree:', error, info);
  }
  handleReload = () => {
    try {
      const g: any = typeof globalThis !== 'undefined' ? globalThis : undefined;
      if (g?.location?.reload) {
        g.location.reload();
        return;
      }
    } catch {
      /* ignore */
    }
    // Fallback: clear error state to re-attempt render (tests / non-browser env)
    this.setState({ error: undefined });
  };
  render() {
    if (this.state.error) {
      const ctx = this.context as ReturnType<typeof useI18n>;
      const t = ctx?.t || ((k: string) => k);
      return (
        <LiteInfoCard title={t('error.card.title')} data-testid="costscope-error-fallback">
          <Stack spacing={2}>
            <Typography color="error" role="alert">
              {t('error.generic')}
            </Typography>
            <Typography variant="caption" sx={{ wordBreak: 'break-word' }}>
              {this.state.error.message}
            </Typography>
            <Button
              variant="contained"
              size="small"
              onClick={this.handleReload}
              data-testid="costscope-error-reload"
            >
              {t('error.reload')}
            </Button>
          </Stack>
        </LiteInfoCard>
      );
    }
    return this.props.children as any;
  }
}

// NOTE: Legacy label sanitization removed. We rely on a dedicated i18n key
// (`footer.githubBackendCore`) that should not be overridden with suffixes.

export const CostscopePage = () => {
  const [period, setPeriod] = useState<PeriodPreset>('P30D');
  const [group, setGroup] = useState<GroupBy>('ServiceCategory');
  const [showDevPanel, setShowDevPanel] = useState<boolean>(false);
  if (__DEV) {
    // dev instrumentation removed
  }
  let analytics: any | undefined;
  try {
    analytics = useApi(analyticsApiRef);
  } catch {
    analytics = undefined;
  }
  const queryClient = useQueryClient();
  const t = useI18n();
  // Footer no longer uses backendLinkRef/backendLabel after redesign
  // Avoid shipping dev-only mount log in production bundles to keep size within budget
  useEffect(() => {
    if (__DEV) {
      logInfo('[costscope-backstage-plugin] CostscopePage mount, version', PLUGIN_VERSION);
    }
  }, []);
  // Kick off a single parallel prefetch and use its error to surface a non-intrusive
  // validation banner at the top of the dashboard when runtime schema checks fail.
  const { error: prefetchError } = usePrefetchedCostscopeData({ period });
  // DEBUG instrumentation: surface that hook ran
  // dev instrumentation removed
  const refreshAll = React.useCallback(async () => {
    // Invalidate all dashboard queries; widgets will refetch
    await Promise.all([
      // Invalidate summary for the period used by CostSummaryHeader (P30D default)
      queryClient.invalidateQueries({ queryKey: qk.summary('P30D', undefined) }),
      queryClient.invalidateQueries({ queryKey: qk.overview(period, undefined) }),
      queryClient.invalidateQueries({ queryKey: qk.breakdown(group, period, undefined) }),
      queryClient.invalidateQueries({ queryKey: qk.actionItems(undefined) }),
      queryClient.invalidateQueries({ queryKey: qk.providers() }),
      queryClient.invalidateQueries({ queryKey: qk.datasets(undefined) }),
    ]);
  }, [queryClient, period, group]);

  // Read initial state from the URL query once on mount (nice-to-have)
  useEffect(() => {
    try {
      const g: any = typeof globalThis !== 'undefined' ? globalThis : undefined;
      const sp = new URLSearchParams(g?.location?.search ?? '');
      const qp = sp.get('period');
      const qg = sp.get('group');
      const allowedP = new Set<PeriodPreset>(['P7D', 'P30D', 'P90D']);
      const allowedG = new Set<GroupBy>(['ServiceCategory', 'RegionId']);
      if (qp && allowedP.has(qp as PeriodPreset)) setPeriod(qp as PeriodPreset);
      if (qg && allowedG.has(qg as GroupBy)) setGroup(qg as GroupBy);
    } catch {
      /* noop */
    }
  }, []);

  // Keep URL query in sync when filters change without polluting history
  useEffect(() => {
    try {
      const g: any = typeof globalThis !== 'undefined' ? globalThis : undefined;
      if (!g?.history?.replaceState || !g?.location) return;
      const sp = new URLSearchParams(g.location.search);
      sp.set('period', period);
      sp.set('group', group);
      const next = `${g.location.pathname}?${sp.toString()}${g.location.hash ?? ''}`;
      g.history.replaceState(null, '', next);
    } catch {
      /* noop */
    }
  }, [period, group]);

  // Update state on back/forward navigation
  useEffect(() => {
    const g: any = typeof globalThis !== 'undefined' ? globalThis : undefined;
    if (!g?.addEventListener) return;
    const onPopState = () => {
      try {
        const sp = new URLSearchParams(g.location.search);
        const qp = sp.get('period');
        const qg = sp.get('group');
        const allowedP = new Set<PeriodPreset>(['P7D', 'P30D', 'P90D']);
        const allowedG = new Set<GroupBy>(['ServiceCategory', 'RegionId']);
        if (qp && allowedP.has(qp as PeriodPreset)) setPeriod(qp as PeriodPreset);
        if (qg && allowedG.has(qg as GroupBy)) setGroup(qg as GroupBy);
      } catch {
        /* noop */
      }
    };
    g.addEventListener('popstate', onPopState);
    return () => g.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (analytics?.captureEvent) {
      try {
        analytics.captureEvent({
          context: DEFAULT_SERVICE_ID,
          action: `${DEFAULT_SERVICE_ID}.page.view`,
          attributes: { location: 'standalone' },
        });
      } catch {
        /* noop */
      }
    }
  }, [analytics]);

  // Removed runtime DOM mutation protections; rely on stable translation key.

  // Dev-only diagnostic log to help track unexpected runtime overrides of i18n
  useEffect(() => {
    try {
      if (__DEV) {
        // dev instrumentation removed (backend label sanitized universally now)
      }
    } catch {
      /* noop */
    }
  }, [t.locale]);

  return (
    <I18nProvider>
      <FormattingProvider>
        <Box component="main" sx={{ p: 3 }} data-testid="costscope-page-root">
          {/* Render the contact link inline with the page title so they appear on one line */}
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="h4"
              component="h2"
              sx={{ mb: 0 }}
              data-testid="costscope-page-title"
            >
              {useI18n().t('page.title')}
            </Typography>
          </Box>
          <LocalErrorBoundary>
            <Stack spacing={2} sx={{ mb: 2 }}>
              {/* Validation banner (non-critical, no toast). Shown only when runtime validation is enabled and fails. */}
              {isCostscopeError(prefetchError) &&
              prefetchError.code === CostscopeErrorCodes.VALIDATION_ERROR ? (
                <Alert
                  severity="warning"
                  variant="outlined"
                  role="alert"
                  aria-live="polite"
                  data-testid="validation-error-banner"
                >
                  <Stack spacing={0.5}>
                    <Typography variant="body1">
                      {useI18n().t('validation.banner.title')}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      {useI18n().t('validation.banner.message')}
                    </Typography>
                    <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
                      {useI18n().t('validation.banner.corr')}:{' '}
                      {(prefetchError as any).correlationId || 'n/a'}
                      {(prefetchError as any).schemaHash
                        ? ` · ${useI18n().t('validation.banner.schemaHash')}: ${(prefetchError as any).schemaHash}`
                        : ''}
                    </Typography>
                  </Stack>
                </Alert>
              ) : null}
              <FiltersBar
                period={period}
                group={group}
                onChangePeriod={(p: PeriodPreset) => setPeriod(p)}
                onChangeGroup={(g: GroupBy) => setGroup(g)}
              />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                {/* Dev-only toggle visible only when not in production */}
                {__DEV ? (
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => setShowDevPanel((s) => !s)}
                    aria-expanded={showDevPanel}
                    aria-controls="costscope-cache-events-panel"
                    data-testid="toggle-cache-events"
                  >
                    {showDevPanel ? 'Hide dev panel' : 'Show dev panel'}
                  </Button>
                ) : (
                  <span />
                )}
                <Button
                  variant="outlined"
                  size="small"
                  onClick={refreshAll}
                  data-testid="dashboard-refresh-all"
                >
                  {useI18n().t('page.refreshAll')}
                </Button>
              </Stack>
              {/* Collapsible dev-only Cache/SWR events panel */}
              {showDevPanel && __DEV ? (
                <div id="costscope-cache-events-panel">
                  <CacheEventsPanel />
                </div>
              ) : null}
            </Stack>
            <Grid container spacing={3}>
              {/* Wave 1 integration: Summary header (composite) at top */}
              <Grid item xs={12}>
                <CostSummaryHeader />
              </Grid>
              {/* Existing overview chart */}
              <Grid item xs={12}>
                <CostOverviewCard period={period} />
              </Grid>
              {/* New two-column operational panels (providers + dataset freshness) */}
              <Grid item xs={12} md={6}>
                <ProvidersPanel />
              </Grid>
              <Grid item xs={12} md={6}>
                <DatasetFreshnessCard limit={5} />
              </Grid>
              {/* Wave 2: Drivers & Distribution section */}
              <Grid item xs={12} md={6}>
                <CostDriversCard period={period} />
              </Grid>
              <Grid item xs={12} md={6}>
                <ChargeCategoryDonut period={period} />
              </Grid>
              {/* Original analytical widgets */}
              <Grid item xs={12} md={6}>
                <BreakdownTable group={group} period={period} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TopServices group={group} period={period} />
              </Grid>
              <Grid item xs={12}>
                <ActionItemsPanel />
              </Grid>
            </Grid>
          </LocalErrorBoundary>
        </Box>
        {/* Plugin footer: copyright + links (2 lines, no GitHub SVG) */}
        <Box
          component="footer"
          data-testid="costscope-footer"
          sx={{
            mt: 4,
            pt: 2,
            borderTop: '1px solid rgba(0,0,0,0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
          }}
        >
          {/* Line 1: © YEAR CostScope • FinOps... • GitHub: CostScope • Plugin */}
          <Typography variant="caption" color="text.secondary">
            <span>© {new Date().getFullYear()} CostScope</span>{' '}
            • <span>{useI18n().t('footer.costscope.desc')}</span>{' '}
            • <span>GitHub: </span>
            <Link href="https://github.com/costscope" target="_blank" rel="noopener noreferrer">
              CostScope
            </Link>{' '}
            •{' '}
            <Link
              href="https://github.com/costscope/costscope-backstage-plugin"
              target="_blank"
              rel="noopener noreferrer"
            >
              {useI18n().t('footer.githubPlugin')}
            </Link>
          </Typography>

          {/* Line 2: See also RuleHub • Plugin • description */}
          <Typography variant="caption" color="text.secondary">
            <span>See also </span>
            <Link href="https://github.com/rulehub" target="_blank" rel="noopener noreferrer">
              RuleHub
            </Link>{' '}
            •{' '}
            <Link
              href="https://github.com/rulehub/rulehub-backstage-plugin"
              target="_blank"
              rel="noopener noreferrer"
            >
              {useI18n().t('footer.githubPlugin')}
            </Link>{' '}
            • <span>{useI18n().t('footer.rulehub.desc')}</span>
          </Typography>
        </Box>
      </FormattingProvider>
    </I18nProvider>
  );
};
