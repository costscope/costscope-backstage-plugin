import { useApi } from '@backstage/core-plugin-api';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { visuallyHidden } from '@mui/utils';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { PieChart, Pie, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts';

import { costscopeApiRef } from '../../../client';
import { useClientStaleTime, useRefetchableCostscope } from '../../../client/hooks';
import { useFormatting } from '../../../formatting';
import { useI18n } from '../../../i18n';
import { qk } from '../../../queryKeys';
import { CardSection, focusRingSx } from '../../ui/CardSection';
import { RefreshSmall as RefreshIcon } from '../../ui/Icons';
import { LiteInfoCard } from '../../ui/LiteInfoCard';

/**
 * ChargeCategoryDonut – visual share of cost by charge category (reuses breakdown endpoint).
 * Keeps implementation intentionally light; snapshot + ARIA tests mock recharts heavy internals.
 */
export const ChargeCategoryDonut = ({ period = 'P30D', project, maxSlices = 6 }: { period?: string; project?: string; maxSlices?: number }) => {
  const api = useApi(costscopeApiRef);
  const { t } = useI18n();
  const { formatCurrency, formatPercent } = useFormatting();
  const staleTime = useClientStaleTime();
  const { data, isLoading, isFetching, error, refetch } = useQuery<import('../../../client').BreakdownRow[]>({
    queryKey: qk.breakdown('ChargeCategory', period, project),
    queryFn: () => api.getBreakdown('ChargeCategory', period, { project }),
    staleTime,
    placeholderData: prev => prev,
  });
  const { refresh, isFetching: fetching } = useRefetchableCostscope(
    { refetch, isFetching },
    {
      queryKey: qk.breakdown('ChargeCategory', period, project),
      target: 'breakdown',
      attrs: { widget: 'chargeDonut', period, dimension: 'ChargeCategory', project },
      fetchFresh: async () => api.getBreakdown('ChargeCategory', period, { project, refresh: true }),
    },
  );

  const processed = React.useMemo(() => {
    const rows = (data ?? []).slice().sort((a, b) => b.cost - a.cost);
    if (rows.length <= maxSlices) return rows;
    const head = rows.slice(0, maxSlices - 1);
    const tail = rows.slice(maxSlices - 1);
    const otherCost = tail.reduce((s, r) => s + r.cost, 0);
    const otherDelta = tail.reduce((s, r) => s + r.deltaPct * r.cost, 0) / (otherCost || 1);
    return [...head, { dim: 'Other', cost: otherCost, deltaPct: otherDelta }];
  }, [data, maxSlices]);

  if (isLoading) {
    return (
      <Stack spacing={1} data-testid="charge-donut-skeleton">
        <Skeleton variant="text" width={200} height={32} />
        <Skeleton variant="rectangular" height={240} />
      </Stack>
    );
  }
  if (error) {
    const corr = (error as any)?.correlationId;
    return (
      <LiteInfoCard title={t('charge.error.title')}>
        <Stack spacing={2}>
          <Typography color="error">{t('charge.error.message')}</Typography>
          {corr && (
            <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
              Correlation ID: {corr}
            </Typography>
          )}
          <IconButton aria-label={t('charge.refresh.aria')} onClick={refresh} disabled={fetching} sx={{ alignSelf: 'flex-start', '&:focus-visible': { outline: '2px solid #1976d2', outlineOffset: 2 } }}>
            {fetching ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
          </IconButton>
        </Stack>
      </LiteInfoCard>
    );
  }

  const headingId = 'costscope-charge-donut-heading';
  const descId = 'costscope-charge-donut-desc';
  const isEmpty = !processed || processed.length === 0;
  const colors = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#0288d1', '#c62828', '#6d4c41'];
  return (
    <CardSection
      headingId={headingId}
      title={t('charge.heading', { projectSuffix: project ? ` (${project})` : '' })}
      actions={
        <IconButton aria-label={t('charge.refresh.aria')} size="small" onClick={refresh} disabled={fetching} sx={focusRingSx} data-testid="charge-donut-refresh">
          {fetching ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
        </IconButton>
      }
    >
      {isEmpty ? (
        <LiteInfoCard title={t('charge.nodata.title')}>
          <Typography>{t('charge.nodata.message')}</Typography>
        </LiteInfoCard>
      ) : (
        <>
          <span style={visuallyHidden as any} id={descId}>
            {t('charge.chart.desc')}
          </span>
          <figure aria-labelledby={headingId} aria-describedby={descId} style={{ margin: 0 }}>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={processed} dataKey="cost" nameKey="dim" innerRadius={50} outerRadius={80} isAnimationActive={false}>
                  {processed.map((r, i) => (
                    <Cell key={r.dim} fill={colors[i % colors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any, _n: any, p: any) => [formatCurrency(Number(v)), p?.payload?.dim]} />
                <Legend formatter={(val: string) => {
                  const row = processed.find(r => r.dim === val);
                  if (!row) return val;
                  return `${val}: ${formatCurrency(row.cost)} (${formatPercent(row.deltaPct)})`;
                }} />
              </PieChart>
            </ResponsiveContainer>
          </figure>
        </>
      )}
    </CardSection>
  );
};

export default ChargeCategoryDonut;
