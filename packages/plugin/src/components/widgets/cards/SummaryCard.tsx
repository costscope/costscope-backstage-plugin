import { useApi } from '@backstage/core-plugin-api';
// Lightweight inline refresh icon (avoid @mui/icons-material heavy import)
const RefreshIcon = (props: { fontSize?: 'small' | 'inherit' }) => (
  <svg
    width={props.fontSize === 'small' ? 16 : 20}
    height={props.fontSize === 'small' ? 16 : 20}
    viewBox="0 0 24 24"
    role="img"
    aria-hidden="true"
    focusable="false"
    style={{ display: 'block' }}
  >
    <path
      fill="currentColor"
      d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.9 9h-2.06A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h9V2l-4.35 4.35Z"
    />
  </svg>
);
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import * as React from 'react';

import { costscopeApiRef } from '../../../client';
import { useClientStaleTime, useRefetchableCostscope } from '../../../client/hooks';
import { useFormatting } from '../../../formatting';
import { useI18n } from '../../../i18n';
import { qk } from '../../../queryKeys';
import { LiteInfoCard } from '../../ui/LiteInfoCard';

export const SummaryCard = ({ period = 'P7D', project }: { period?: string; project?: string }) => {
  const api = useApi(costscopeApiRef);
  const { t } = useI18n();
  const { formatCurrency, formatPercent } = useFormatting();
  const staleTime = useClientStaleTime();
  const { data, isLoading, isFetching, error, refetch } = useQuery<any>({
    queryKey: qk.summary(period, project),
    queryFn: async () => {
      // getSummary may be optional on some older client surfaces
      const fn = (api as any).getSummary as undefined | ((p: string, o?: any) => Promise<any>);
      if (!fn) return null;
      const res = await fn(period, { project });
      return res ?? null;
    },
  staleTime,
  });
  const { refresh, isFetching: fetching } = useRefetchableCostscope(
    { refetch, isFetching },
    {
      queryKey: qk.summary(period, project),
      target: 'summary',
      attrs: { period, location: project ? 'entity' : 'standalone', project },
      fetchFresh: async () => {
        const fn = (api as any).getSummary as undefined | ((p: string, o?: any) => Promise<any>);
        if (!fn) return null as any;
        return fn(period, { project, refresh: true });
      },
    },
  );

  if (isLoading) {
    return (
      <Stack spacing={1} data-testid="summary-skeleton">
        <Skeleton variant="text" width={180} height={32} />
        <Skeleton variant="rectangular" height={96} />
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
          <Button variant="contained" size="small" onClick={refresh} disabled={isFetching}>
            {t('summary.retry')}
          </Button>
        </Stack>
      </LiteInfoCard>
    );
  }

  const isEmpty = !data || typeof data !== 'object';
  const headingId = 'costscope-summary-heading';

  return (
    <Stack role="region" aria-labelledby={headingId} spacing={1}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
  <Typography id={headingId} variant="h6" component="h2" sx={{ mb: 0 }}>
          {t('summary.heading', { projectSuffix: project ? ` (${project})` : '' })}
        </Typography>
        <IconButton
          aria-label={t('summary.refresh.aria')}
          size="small"
          onClick={refresh}
          disabled={fetching}
          sx={{ '&:focus-visible': { outline: '2px solid #1976d2', outlineOffset: 2 } }}
        >
          {fetching ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
        </IconButton>
      </Stack>
      {isEmpty ? (
        <LiteInfoCard title={t('summary.nodata.title')}>
          <Typography>{t('summary.nodata.message')}</Typography>
        </LiteInfoCard>
      ) : (
        <LiteInfoCard>
          <Stack direction="row" spacing={4} alignItems="baseline">
            <div>
              <Typography variant="caption">{t('summary.total')}</Typography>
              <Typography variant="h5">{formatCurrency((data as any).totalCost || 0)}</Typography>
            </div>
            <div>
              <Typography variant="caption">{t('summary.previous')}</Typography>
              <Typography>{formatCurrency((data as any).prevPeriodCost || (data as any).previousTotalCost || 0)}</Typography>
            </div>
            <div>
              <Typography variant="caption">{t('summary.delta')}</Typography>
              <Typography color={(data as any).deltaPct > 0 ? 'error' : 'success.main'}>
                {formatPercent((data as any).deltaPct || 0)}
              </Typography>
            </div>
          </Stack>
        </LiteInfoCard>
      )}
    </Stack>
  );
};
