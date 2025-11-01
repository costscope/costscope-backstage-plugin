import { useApi } from '@backstage/core-plugin-api';
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
import { CardSection, focusRingSx } from '../../ui/CardSection';
import { RefreshSmall as RefreshIcon } from '../../ui/Icons';
import { LiteInfoCard } from '../../ui/LiteInfoCard';

/**
 * DatasetFreshnessCard – shows recent ingestion datasets (short metadata) for a project/global.
 * Basic a11y: region landmark, caption, focusable refresh button.
 */
export const DatasetFreshnessCard = ({ project, limit = 5 }: { project?: string; limit?: number }) => {
  const api = useApi(costscopeApiRef) as any;
  const { t } = useI18n();
  const staleTime = useClientStaleTime();
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: qk.datasets(project),
    queryFn: () => api.getDatasets?.({ project }),
    staleTime,
    placeholderData: (prev: any) => prev,
  });
  const { refresh, isFetching: fetching } = useRefetchableCostscope(
    { refetch, isFetching },
    {
      queryKey: qk.datasets(project),
      target: 'datasets',
      attrs: { location: project ? 'entity' : 'standalone', project },
      fetchFresh: async () => api.getDatasets?.({ project, refresh: true }),
    },
  );

  if (isLoading) {
    return (
      <Stack spacing={1} data-testid="datasets-freshness-skeleton">
        <Skeleton variant="text" width={220} height={32} />
        <Skeleton variant="rectangular" height={120} />
      </Stack>
    );
  }
  if (error) {
    const corr = (error as any)?.correlationId;
    return (
      <LiteInfoCard title={t('freshness.error.title')}>
        <Stack spacing={2}>
          <Typography color="error">{t('freshness.error.message')}</Typography>
          {corr && (
            <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
              Correlation ID: {corr}
            </Typography>
          )}
          <IconButton
            aria-label={t('freshness.refresh.aria')}
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

  const rows = (data ?? []) as Array<{ id: string; provider: string; periodStart: string; periodEnd: string; status: string; records: number; createdAt?: string }>;
  const sliced = rows.slice(0, limit);
  const isEmpty = sliced.length === 0;
  const headingId = 'costscope-datasets-freshness-heading';
  return (
    <CardSection
      headingId={headingId}
      title={t('freshness.heading', { projectSuffix: project ? ` (${project})` : '' })}
      actions={
        <IconButton aria-label={t('freshness.refresh.aria')} size="small" onClick={refresh} disabled={fetching} sx={focusRingSx}>
          {fetching ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
        </IconButton>
      }
    >
      {isEmpty ? (
        <LiteInfoCard title={t('freshness.nodata.title')}>
          <Typography>{t('freshness.nodata.message')}</Typography>
        </LiteInfoCard>
      ) : (
        <Table size="small" aria-label={t('freshness.table.aria')} aria-describedby="costscope-freshness-caption">
          <caption id="costscope-freshness-caption" style={{ textAlign: 'left', padding: 0, captionSide: 'top' }}>
            {t('freshness.caption')}
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
            {sliced.map(r => (
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
    </CardSection>
  );
};
