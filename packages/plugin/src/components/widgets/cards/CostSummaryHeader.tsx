import { useApi } from '@backstage/core-plugin-api';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { costscopeApiRef } from '../../../client';
import { useClientStaleTime } from '../../../client/hooks';
import { useFormatting } from '../../../formatting';
import { useI18n } from '../../../i18n';
import { qk } from '../../../queryKeys';
import { CardSection, focusRingSx } from '../../ui/CardSection';
import { RefreshSmall as RefreshIcon } from '../../ui/Icons';
import { LiteInfoCard } from '../../ui/LiteInfoCard';

/**
 * CostSummaryHeader – composite widget showing summary metrics + top service share.
 * Period defaults to P30D; uses breakdown(ServiceCategory) to find top N (5) rows.
 */
export const CostSummaryHeader = ({ period = 'P30D', project, topN = 5 }: { period?: string; project?: string; topN?: number }) => {
  const api: any = useApi(costscopeApiRef);
  const { t } = useI18n();
  const { formatCurrency, formatPercent } = useFormatting();
  const staleTime = useClientStaleTime();

  const summaryQuery = useQuery<any>({
    queryKey: qk.summary(period, project),
    queryFn: async () => api.getSummary?.(period, { project }),
    staleTime,
    placeholderData: (prev: any) => prev,
  });
  const breakdownQuery = useQuery<any[]>({
    queryKey: qk.breakdown('ServiceCategory', period, project),
    queryFn: async () => api.getBreakdown?.('ServiceCategory', period, { project }),
    staleTime,
    placeholderData: (prev: any) => prev,
  });

  const isLoading = summaryQuery.isLoading || breakdownQuery.isLoading;
  const error = summaryQuery.error || breakdownQuery.error;
  const fetching = summaryQuery.isFetching || breakdownQuery.isFetching;

  const refresh = React.useCallback(async () => {
    await Promise.all([
      summaryQuery.refetch({ throwOnError: false, cancelRefetch: false }),
      breakdownQuery.refetch({ throwOnError: false, cancelRefetch: false }),
    ]);
  }, [summaryQuery, breakdownQuery]);

  if (isLoading) {
    return (
      <Stack spacing={1} data-testid="cost-summary-header-skeleton">
        <Skeleton variant="text" width={260} height={32} />
        <Skeleton variant="rectangular" height={80} />
      </Stack>
    );
  }

  if (error) {
    const corr = (error as any)?.correlationId;
    return (
      <LiteInfoCard title={t('summary.error.title')}>
        <Stack spacing={2}>
          <Typography color="error">{t('summary.error.message')}</Typography>
          {corr && (
            <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
              Correlation ID: {corr}
            </Typography>
          )}
          <IconButton
            aria-label={t('summaryHeader.refresh.aria')}
            onClick={refresh}
            disabled={fetching}
            sx={{ alignSelf: 'flex-start', '&:focus-visible': { outline: '2px solid #1976d2', outlineOffset: 2 } }}
          >
            {fetching ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
          </IconButton>
        </Stack>
      </LiteInfoCard>
    );
  }

  const summary = summaryQuery.data || {};
  const rows = Array.isArray(breakdownQuery.data) ? breakdownQuery.data.slice().sort((a, b) => b.cost - a.cost) : [];
  const top = rows.slice(0, Math.max(0, topN));
  const totalCost = Number(summary.totalCost || 0);
  const topService = top[0];
  const topSharePct = totalCost > 0 && topService ? topService.cost / totalCost : 0;
  const headingId = 'costscope-summary-header-heading';
  const projectSuffix = project ? ` (${project})` : '';
  return (
    <CardSection
      headingId={headingId}
      title={t('summaryHeader.heading', { projectSuffix })}
      actions={
        <IconButton aria-label={t('summaryHeader.refresh.aria')} size="small" onClick={refresh} disabled={fetching} sx={focusRingSx}>
          {fetching ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
        </IconButton>
      }
    >
      <LiteInfoCard>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4} alignItems="baseline" flexWrap="wrap">
          <div>
            <Typography variant="caption">{t('summary.total')}</Typography>
            <Typography variant="h5">{formatCurrency(totalCost)}</Typography>
          </div>
          <div>
            <Typography variant="caption">{t('summary.delta')}</Typography>
            <Typography color={summary.deltaPct > 0 ? 'error' : summary.deltaPct < 0 ? 'success.main' : 'text.primary'}>
              {formatPercent(summary.deltaPct || 0)}
            </Typography>
          </div>
          <div>
            <Typography variant="caption">{t('summaryHeader.avgDaily')}</Typography>
            <Typography>{formatCurrency(summary.avgDailyCost || 0)}</Typography>
          </div>
          <div>
            <Typography variant="caption">{t('summaryHeader.topService')}</Typography>
            {topService ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography>{topService.dim}</Typography>
                <Chip size="small" label={formatCurrency(topService.cost)} />
              </Stack>
            ) : (
              <Typography sx={{ opacity: 0.7 }}>—</Typography>
            )}
          </div>
          <div>
            <Typography variant="caption">{t('summaryHeader.topShare')}</Typography>
            <Typography>{formatPercent(topSharePct || 0)}</Typography>
          </div>
        </Stack>
      </LiteInfoCard>
    </CardSection>
  );
};

export default CostSummaryHeader;
