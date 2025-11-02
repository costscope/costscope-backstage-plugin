import { useApi } from '@backstage/core-plugin-api';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { visuallyHidden } from '@mui/utils';
import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { costscopeApiRef } from '../../../client';
import { useClientStaleTime, useRefetchableCostscope } from '../../../client/hooks';
import { useFormatting } from '../../../formatting';
import { useI18n } from '../../../i18n';
import { qk } from '../../../queryKeys';
import { CardSection, focusRingSx } from '../../ui/CardSection';
import { RefreshSmall as RefreshIcon } from '../../ui/Icons';
import { LiteInfoCard } from '../../ui/LiteInfoCard';

/** @public */
export interface CostDriversCardProps {
  period?: string;
  project?: string;
  dimension?: string; // e.g. ServiceCategory or RegionId
  limit?: number;
}

/**
 * CostDriversCard – table of top N cost drivers (dimension, cost, delta percent).
 * Keeps implementation light (no pagination / sorting controls yet).
 */
/** @public */
export const CostDriversCard = ({ period = 'P30D', project, dimension = 'ServiceCategory', limit = 5 }: CostDriversCardProps) => {
  const api = useApi(costscopeApiRef);
  const { t } = useI18n();
  const { formatCurrency, formatPercent } = useFormatting();
  const staleTime = useClientStaleTime();
  const { data, isLoading, isFetching, error, refetch } = useQuery<import('../../../client').BreakdownRow[]>({
    queryKey: qk.breakdown(dimension, period, project),
    queryFn: () => api.getBreakdown(dimension, period, { project }),
    staleTime,
    placeholderData: prev => prev,
  });
  const { refresh, isFetching: fetching } = useRefetchableCostscope(
    { refetch, isFetching },
    {
      queryKey: qk.breakdown(dimension, period, project),
      target: 'breakdown',
      attrs: { widget: 'costDrivers', period, dimension, project },
      fetchFresh: async () => api.getBreakdown(dimension, period, { project, refresh: true }),
    },
  );

  const rows = React.useMemo(() => {
    const list = (data ?? []).slice().sort((a, b) => b.cost - a.cost).slice(0, Math.max(0, limit));
    return list;
  }, [data, limit]);

  if (isLoading) {
    return (
      <Stack spacing={1} data-testid="drivers-skeleton">
        <Skeleton variant="text" width={200} height={32} />
        <Skeleton variant="rectangular" height={180} />
      </Stack>
    );
  }

  if (error) {
    const corr = (error as any)?.correlationId;
    return (
      <LiteInfoCard title={t('drivers.error.title')}>
        <Stack spacing={2}>
          <Typography color="error">{t('drivers.error.message')}</Typography>
          {corr && (
            <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
              Correlation ID: {corr}
            </Typography>
          )}
          <IconButton
            aria-label={t('drivers.refresh.aria')}
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

  const headingId = 'costscope-drivers-heading';
  const isEmpty = rows.length === 0;
  const captionId = 'costscope-drivers-caption';
  return (
    <CardSection
      headingId={headingId}
      title={t('drivers.heading', { projectSuffix: project ? ` (${project})` : '' })}
      actions={
        <IconButton
          aria-label={t('drivers.refresh.aria')}
          size="small"
          onClick={refresh}
          disabled={fetching}
          sx={focusRingSx}
          data-testid="drivers-refresh"
        >
          {fetching ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
        </IconButton>
      }
    >
      {isEmpty ? (
        <LiteInfoCard title={t('drivers.nodata.title')}>
          <Typography>{t('drivers.nodata.message')}</Typography>
        </LiteInfoCard>
      ) : (
        <TableContainer component={Paper} elevation={0} variant="outlined">
          <Table size="small" aria-label={t('drivers.table.aria')}>
            <caption id={captionId} style={visuallyHidden as any}>{t('drivers.caption')}</caption>
            <TableHead>
              <TableRow>
                <TableCell>{dimension}</TableCell>
                <TableCell align="right">{t('breakdown.cost')}</TableCell>
                <TableCell align="right">{t('breakdown.deltaPct')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(r => {
                const deltaColor = r.deltaPct > 0 ? 'error.main' : r.deltaPct < 0 ? 'success.main' : 'text.secondary';
                return (
                  <TableRow key={r.dim} hover>
                    <TableCell component="th" scope="row">{r.dim}</TableCell>
                    <TableCell align="right">{formatCurrency(r.cost)}</TableCell>
                    <TableCell align="right" sx={{ color: (theme) => theme.palette.mode === 'dark' ? theme.palette.getContrastText(theme.palette.background.default) : deltaColor }}>
                      {formatPercent(r.deltaPct)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </CardSection>
  );
};

export default CostDriversCard;
