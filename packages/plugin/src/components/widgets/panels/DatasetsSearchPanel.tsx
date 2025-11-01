import { useApi } from '@backstage/core-plugin-api';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { costscopeApiRef } from '../../../client';
import { useClientStaleTime, useRefetchableCostscope } from '../../../client/hooks';
import { useI18n } from '../../../i18n';
import { qk } from '../../../utils/queryKeys';
import { RefreshSmall as RefreshIcon } from '../../ui/Icons';
import { LiteInfoCard } from '../../ui/LiteInfoCard';

export interface DatasetsSearchPanelProps {
  project?: string;
  provider?: string;
  status?: string;
  from?: string;
  to?: string;
  minRecords?: number;
  maxRecords?: number;
  limit?: number;
}

/** Minimal datasets search results table (no pagination yet). */
export const DatasetsSearchPanel = (filters: DatasetsSearchPanelProps) => {
  const api = useApi(costscopeApiRef) as any;
  const { t } = useI18n();
  const staleTime = useClientStaleTime();
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: qk.datasetsSearch(filters),
    queryFn: () => api.searchDatasets?.(filters),
    staleTime,
    placeholderData: (prev: any) => prev,
  });

  const { refresh, isFetching: fetching } = useRefetchableCostscope(
    { refetch, isFetching },
    {
      queryKey: qk.datasetsSearch(filters),
      target: 'datasetsSearch',
      attrs: { ...filters, location: filters.project ? 'entity' : 'standalone' },
      fetchFresh: async () => api.searchDatasets?.({ ...filters, refresh: true }),
    },
  );

  if (isLoading) {
    return (
      <Stack spacing={1} data-testid="datasets-search-skeleton">
        <Skeleton variant="text" width={220} height={32} />
        <Skeleton variant="rectangular" height={160} />
      </Stack>
    );
  }
  if (error) {
    const corr = (error as any)?.correlationId;
    return (
      <LiteInfoCard title={t('datasets.error.title')}>
        <Stack spacing={2}>
          <Typography color="error">{t('datasets.error.message')}</Typography>
          {corr && (
            <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
              Correlation ID: {corr}
            </Typography>
          )}
          <IconButton
            aria-label={t('datasets.refresh.aria')}
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

  const rows = (data ?? []) as Array<{
    id: string; provider: string; periodStart: string; periodEnd: string; records: number; status: string;
  }>;
  const isEmpty = rows.length === 0;
  const headingId = 'costscope-datasets-heading';

  const activeFilters = Object.entries(filters)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}:${v}`);

  return (
    <Stack spacing={1} role="region" aria-labelledby={headingId}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography id={headingId} variant="h6" component="h2" sx={{ mb: 0 }}>
          {t('datasets.heading')}
        </Typography>
        <IconButton
          aria-label={t('datasets.refresh.aria')}
          size="small"
          onClick={refresh}
          disabled={fetching}
          sx={{ '&:focus-visible': { outline: '2px solid #1976d2', outlineOffset: 2 } }}
        >
          {fetching ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
        </IconButton>
      </Stack>
      {activeFilters.length > 0 && (
        <Stack direction="row" spacing={1} flexWrap="wrap" aria-label={t('datasets.filters.aria')}>
          {activeFilters.map(f => (
            <Chip key={f} size="small" label={f} variant="outlined" />
          ))}
        </Stack>
      )}
      {isEmpty ? (
        <LiteInfoCard title={t('datasets.nodata.title')}>
          <Typography>{t('datasets.nodata.message')}</Typography>
        </LiteInfoCard>
      ) : (
        <Table
          size="small"
          aria-label={t('datasets.table.aria')}
          aria-describedby="costscope-datasets-caption"
          sx={{ '& th': { fontWeight: 500 } }}
        >
          <caption id="costscope-datasets-caption" style={{ textAlign: 'left', padding: 0, captionSide: 'top' }}>
            {t('datasets.caption')}
          </caption>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>{t('datasets.col.provider')}</TableCell>
              <TableCell>{t('datasets.col.period')}</TableCell>
              <TableCell align="right">{t('datasets.col.records')}</TableCell>
              <TableCell>{t('datasets.col.status')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id} hover tabIndex={0} aria-label={`dataset ${r.id}`}>
                <TableCell>{r.id}</TableCell>
                <TableCell>{r.provider}</TableCell>
                <TableCell>{r.periodStart} → {r.periodEnd}</TableCell>
                <TableCell align="right">{r.records.toLocaleString()}</TableCell>
                <TableCell>{r.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
};
