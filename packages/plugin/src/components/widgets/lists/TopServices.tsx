import { useApi } from '@backstage/core-plugin-api';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { costscopeApiRef } from '../../../client';
import { useClientStaleTime, useRefetchableCostscope } from '../../../client/hooks';
import { useFormatting } from '../../../formatting';
import { useI18n } from '../../../i18n';
import { qk } from '../../../queryKeys';
import { RefreshSmall as RefreshIcon } from '../../ui/Icons';
import { LiteInfoCard } from '../../ui/LiteInfoCard';

export interface TopServicesProps {
	period?: string;
	project?: string;
	/** Group/dimension to aggregate by. Defaults to ServiceCategory */
	group?: 'ServiceCategory' | 'RegionId' | string;
	/** Number of rows to display (by cost desc). Default 5 */
	limit?: number;
}

/**
 * Lightweight Top Services widget using MUI v5 + React Query.
 * Data source: breakdown by ServiceCategory for the selected period/project.
 */
export const TopServices = ({ period = 'P30D', project, group = 'ServiceCategory', limit = 5 }: TopServicesProps) => {
	const api = useApi(costscopeApiRef);
	const { t } = useI18n();
	const { formatCurrency, formatPercent } = useFormatting();
    const staleTime = useClientStaleTime();

	const { data, isLoading, isFetching, error, refetch } = useQuery<import('../../../client').BreakdownRow[]>({
		queryKey: qk.breakdown(group, period, project),
			queryFn: () => api.getBreakdown(group, period, { project }),
		staleTime,
		placeholderData: prev => prev,
	});

		const { refresh, isFetching: fetching } = useRefetchableCostscope(
			{ refetch, isFetching },
			{
				queryKey: qk.breakdown(group, period, project),
				target: 'breakdown',
				attrs: { widget: 'topN', period, group, location: project ? 'entity' : 'standalone', project },
				fetchFresh: async () => api.getBreakdown(group, period, { project, refresh: true }),
			},
		);

	const list = React.useMemo(() => {
		const rows = (data ?? []).slice().sort((a, b) => b.cost - a.cost).slice(0, Math.max(0, limit));
		return rows;
	}, [data, limit]);

	const headingId = 'costscope-top-services-heading';
	const title = React.useMemo(() => {
		return group === 'RegionId'
			? t('top.heading.regions', { projectSuffix: project ? ` (${project})` : '' })
			: t('top.heading.services', { projectSuffix: project ? ` (${project})` : '' });
	}, [group, project, t]);
	const listAria = React.useMemo(() => {
		return group === 'RegionId' ? t('top.list.aria.regions') : t('top.list.aria.services');
	}, [group, t]);
	const isEmpty = list.length === 0;

	if (isLoading) {
		return (
			<Stack spacing={1} data-testid="top-services-skeleton">
				<Skeleton variant="text" width={200} height={32} />
				<Skeleton variant="rectangular" height={160} />
			</Stack>
		);
	}

	if (error) {
		const corr = (error as any)?.correlationId;
		return (
	<LiteInfoCard title={t('top.error.title')}>
				<Stack spacing={2}>
					<Typography color="error">{t('top.error.message')}</Typography>
					{corr && (
						<Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
							Correlation ID: {corr}
						</Typography>
					)}
                    <IconButton
						aria-label={t('top.refresh.aria')}
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

	return (
		<Stack spacing={1} role="region" aria-labelledby={headingId}>
			<Stack direction="row" alignItems="center" justifyContent="space-between">
				<Typography id={headingId} variant="h6" component="h2" sx={{ mb: 0 }}>
					{title}
				</Typography>
				<IconButton
					aria-label={t('top.refresh.aria')}
					size="small"
					onClick={refresh}
					disabled={fetching}
					sx={{ '&:focus-visible': { outline: '2px solid #1976d2', outlineOffset: 2 } }}
					data-testid="top-services-refresh"
				>
					{fetching ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
				</IconButton>
			</Stack>

			{isEmpty ? (
	<LiteInfoCard title={t('top.nodata.title')}>
					<Typography>{t('top.nodata.message')}</Typography>
	</LiteInfoCard>
			) : (
				<List aria-label={listAria}>
					{list.map((row, idx) => {
						const secondary = formatPercent(row.deltaPct);
						const color = row.deltaPct > 0 ? 'error' : row.deltaPct < 0 ? 'success' : 'text';
						return (
							<ListItem key={`${row.dim}-${idx}`} divider sx={{ py: 0.5 }} data-testid={`service-${row.dim}`}>
								<ListItemText
									primary={row.dim}
									primaryTypographyProps={{ variant: 'body1' }}
									secondary={secondary}
									secondaryTypographyProps={{ sx: { color: (theme) => (color === 'text' ? theme.palette.text.secondary : theme.palette[color as 'error' | 'success'].main) } }}
								/>
								<Chip label={formatCurrency(row.cost)} size="small" color="default" variant="outlined" />
							</ListItem>
						);
					})}
				</List>
			)}
		</Stack>
	);
};

