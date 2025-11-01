import { useApi } from '@backstage/core-plugin-api';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { costscopeApiRef } from '../../../client';
import { useClientStaleTime, useRefetchableCostscope } from '../../../client/hooks';
import { useI18n } from '../../../i18n';
import { qk } from '../../../queryKeys';
import { CardSection, focusRingSx } from '../../ui/CardSection';
import { CircleStatus as CircleIcon, RefreshSmall as RefreshIcon } from '../../ui/Icons';
import { LiteInfoCard } from '../../ui/LiteInfoCard';

/**
 * ProvidersPanel – lists cloud providers surfaced by the FinOps backend.
 * Accessible: region landmark + heading + refresh button with focus ring.
 */
export const ProvidersPanel = () => {
  const api = useApi(costscopeApiRef) as any;
  const { t } = useI18n();
  const staleTime = useClientStaleTime();
  const { data, isLoading, isFetching, error, refetch } = useQuery<any[]>({
    queryKey: qk.providers(),
    queryFn: () => api.getProviders?.(),
    staleTime,
    placeholderData: prev => prev,
  });
  const { refresh, isFetching: fetching } = useRefetchableCostscope(
    { refetch, isFetching },
    {
      queryKey: qk.providers(),
      target: 'providers',
      attrs: { location: 'standalone' },
      fetchFresh: async () => api.getProviders?.({ refresh: true }),
    },
  );

  if (isLoading) {
    return (
      <Stack spacing={1} data-testid="providers-skeleton">
        <Skeleton variant="text" width={180} height={32} />
        <Skeleton variant="rectangular" height={120} />
      </Stack>
    );
  }
  if (error) {
    const corr = (error as any)?.correlationId;
    return (
      <LiteInfoCard title={t('providers.error.title')}>
        <Stack spacing={2}>
          <Typography color="error">{t('providers.error.message')}</Typography>
          {corr && (
            <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
              Correlation ID: {corr}
            </Typography>
          )}
          <IconButton
            aria-label={t('providers.refresh.aria')}
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

  const list = (data ?? []) as Array<{ id: string; name: string; status?: string }>;
  const isEmpty = list.length === 0;
  const headingId = 'costscope-providers-heading';
  return (
    <CardSection
      headingId={headingId}
      title={t('providers.heading')}
      actions={
        <IconButton aria-label={t('providers.refresh.aria')} size="small" onClick={refresh} disabled={fetching} sx={focusRingSx}>
          {fetching ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
        </IconButton>
      }
    >
      {isEmpty ? (
        <LiteInfoCard title={t('providers.nodata.title')}>
          <Typography>{t('providers.nodata.message')}</Typography>
        </LiteInfoCard>
      ) : (
        <List aria-label={t('providers.list.aria')} dense>
          {list.map(p => {
            const color = p.status === 'error' ? 'error.main' : p.status === 'degraded' ? 'warning.main' : 'success.main';
            return (
              <ListItem key={p.id} divider sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 28 }}>
                  <CircleIcon fontSize="small" sx={{ color }} />
                </ListItemIcon>
                <ListItemText primary={p.name} secondary={p.status || 'ok'} />
              </ListItem>
            );
          })}
        </List>
      )}
    </CardSection>
  );
};
