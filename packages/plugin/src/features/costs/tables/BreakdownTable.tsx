import { useApi, featureFlagsApiRef } from '@backstage/core-plugin-api';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import MuiTable from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { visuallyHidden } from '@mui/utils';
import { useQuery } from '@tanstack/react-query';
import * as React from 'react';

import { costscopeApiRef } from '../../../client';
import { useClientStaleTime, useRefetchableCostscope } from '../../../client/hooks';
import { RefreshSmall as RefreshIcon } from '../../../components/ui/Icons';
import { LiteInfoCard } from '../../../components/ui/LiteInfoCard';
import { useFormatting } from '../../../formatting';
import { useI18n } from '../../../i18n';
import { qk } from '../../../queryKeys';
// dev instrumentation removed

export function computeBreakdownTableData(
  data: import('../../../client').BreakdownRow[] | undefined,
  v2: boolean,
): any[] | undefined {
  if (!data) return data as any;
  if (!v2) return data as any;
  return data.map(r => {
    const anyR: any = r as any;
    const baseDelta = typeof anyR.deltaPct === 'number' ? anyR.deltaPct : 0;
    const effectiveCost = anyR.effectiveCost !== undefined ? anyR.effectiveCost : r.cost * (1 - baseDelta / 10);
    const recomputedDeltaPct = (effectiveCost - r.cost) / r.cost;
    return { ...anyR, effectiveCost, deltaPct: recomputedDeltaPct };
  });
}

export const BreakdownTable = ({
  group = 'ServiceCategory',
  period = 'P30D',
  project,
}: {
  group?: string;
  period?: string;
  project?: string;
}) => {
  const api = useApi(costscopeApiRef);
  const { t } = useI18n();
  // analytics captured inside hook
  const featureFlagsApi = useApi(featureFlagsApiRef);
  const { formatCurrency, formatPercent } = useFormatting();
  const staleTime = useClientStaleTime();
  const { data, isLoading, isFetching, error, refetch } = useQuery<import('../../../client').BreakdownRow[]>({
    queryKey: qk.breakdown(group, period, project),
    queryFn: () => api.getBreakdown(group, period, { project }),
    placeholderData: previousData => previousData, // keep table populated while refetching
    staleTime,
  });
  // dev instrumentation removed

  const v2 = featureFlagsApi?.isActive?.('costscope.breakdown.v2') ?? false;

  // Derive columns based on feature flag (v2 adds EffectiveCost column)
  type Column = { title: string; field: string; type?: 'numeric' | 'string'; render?: (row: any) => React.ReactNode };
  const columns: Column[] = React.useMemo(() => {
    const base: Column[] = [
      { title: group, field: 'dim' },
      { title: t('breakdown.cost'), field: 'cost', type: 'numeric', render: (r: any) => formatCurrency(r.cost) },
      { title: t('breakdown.deltaPct'), field: 'deltaPct', type: 'numeric', render: (r: any) => formatPercent(r.deltaPct) },
    ];
    if (v2) {
      base.splice(2, 0, {
        title: t('breakdown.effectiveCost'),
        field: 'effectiveCost',
        type: 'numeric',
        render: (r: any) => formatCurrency(r.effectiveCost ?? r.cost),
      });
    }
    return base;
  }, [v2, group, formatCurrency, formatPercent, t]);

  // If v2 enabled: ensure Effective Cost column and recompute deltaPct based on Effective vs original Cost.
  // Formula (placeholder until backend serves authoritative numbers):
  //   effectiveCost = provided effectiveCost OR fallback cost * (1 - (origDeltaPct || 0)/10)
  //   recomputedDeltaPct = (effectiveCost - cost) / cost
  // This keeps sign semantics (negative => savings) while showing relative change between nominal and effective.
  const tableData = React.useMemo(() => computeBreakdownTableData(data, v2), [data, v2]);

  const { refresh: handleRefresh, isFetching: fetching } = useRefetchableCostscope(
    { refetch, isFetching },
    {
      queryKey: qk.breakdown(group, period, project),
      target: 'breakdown',
      attrs: { period, group, location: project ? 'entity' : 'standalone', project },
      fetchFresh: async () => api.getBreakdown(group, period, { project, refresh: true }),
    },
  );

  if (isLoading) {
    return (
      <Stack spacing={1} data-testid="breakdown-table-skeleton">
        <Skeleton variant="text" width={260} height={32} />
        {/* Approximate table height placeholder */}
        <Skeleton variant="rectangular" height={220} />
      </Stack>
    );
  }
  if (error) return (
    <LiteInfoCard title={t('breakdown.error.title')}>
      <Stack spacing={2}>
        <Typography color="error">{t('breakdown.error.message')}</Typography>
        {(error as any)?.correlationId && (
          <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
            Correlation ID: {(error as any).correlationId}
          </Typography>
        )}
        <Button variant="contained" size="small" onClick={handleRefresh} disabled={isFetching}>{t('breakdown.retry')}</Button>
      </Stack>
    </LiteInfoCard>
  );

  const headingId = `costscope-${group.toLowerCase()}-breakdown-heading`;
  const isEmpty = !data || data.length === 0;

  return (
    <Stack spacing={1} role="region" aria-labelledby={headingId}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
  <Typography id={headingId} variant="h6" component="h2" sx={{ mb: 0 }}>{t('breakdown.heading', { group, projectSuffix: project ? ` (${project})` : '' })}</Typography>
        <IconButton
          aria-label={t('breakdown.refresh.aria', { group })}
          size="small"
          onClick={handleRefresh}
          disabled={fetching}
          sx={{ '&:focus-visible': { outline: '2px solid #1976d2', outlineOffset: 2 } }}
        >
          {fetching ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
        </IconButton>
      </Stack>
      {isEmpty ? (
        <LiteInfoCard title={t('breakdown.nodata.title')}>
          <Typography>{t('breakdown.nodata.message')}</Typography>
        </LiteInfoCard>
      ) : (
        <>
          {/* Visually hidden caption to aid screen reader users */}
          <span style={visuallyHidden as any} id={`${headingId}-caption`}>
            {t('breakdown.caption', { group })}
          </span>
          <MuiTable aria-label={`${group} cost breakdown table`} aria-describedby={`${headingId}-caption`}>
            <TableHead>
              <TableRow>
                {columns.map(col => (
                  <TableCell key={col.title} align={col.type === 'numeric' ? 'right' : 'left'}>
                    {col.title}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {(tableData ?? []).map((row: any, idx: number) => (
                <TableRow key={idx} hover>
                  {columns.map(col => (
                    <TableCell key={col.title} align={col.type === 'numeric' ? 'right' : 'left'}>
                      {col.render ? col.render(row) : (row as any)[col.field]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </MuiTable>
        </>
      )}
    </Stack>
  );
}
