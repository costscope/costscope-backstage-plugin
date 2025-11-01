import { useApi } from '@backstage/core-plugin-api';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { costscopeApiRef } from '../../../client';
import { useClientStaleTime, useRefetchableCostscope } from '../../../client/hooks';
import { DEFAULT_SERVICE_ID } from '../../../constants';
import { useI18n } from '../../../i18n';
import { qk } from '../../../queryKeys';
import { ErrorOutline as ErrorOutlineIcon, InfoOutlined as InfoOutlinedIcon, RefreshSmall as RefreshIcon, WarningAmber as WarningAmberIcon } from '../../ui/Icons';
import { LiteInfoCard } from '../../ui/LiteInfoCard';

const colorMap: Record<string, 'primary' | 'warning' | 'error'> = {
	info: 'primary',
	warn: 'warning',
	critical: 'error',
};

const severityIconMap: Record<string, React.ElementType> = {
	info: InfoOutlinedIcon,
	warn: WarningAmberIcon,
	critical: ErrorOutlineIcon,
};

export const ActionItemsPanel = ({ project }: { project?: string }) => {
	const api = useApi(costscopeApiRef);
	const { t } = useI18n();
	const queryClient = useQueryClient();
	const staleTime = useClientStaleTime();
		const { data, isLoading, isFetching, error, refetch } = useQuery({
		queryKey: qk.actionItems(project),
		queryFn: () => api.getActionItems({ project }),
		staleTime,
	});
		const { refresh: handleRefresh, isFetching: fetching } = useRefetchableCostscope(
			{ refetch, isFetching },
			{
				queryKey: qk.actionItems(project),
				target: 'actionItems',
				attrs: { location: project ? 'entity' : 'standalone', project },
				fetchFresh: async () => api.getActionItems({ project, refresh: true }),
			},
		);

	// Optimistic mutation placeholder (e.g., dismiss action item)
	const dismissMutation = useMutation<{ id: string }, Error, string>({
		mutationKey: [DEFAULT_SERVICE_ID, 'actionItems', 'dismiss'],
		mutationFn: async (id: string) => {
			// Placeholder: pretend API call
			await new Promise(r => setTimeout(r, 400));
			return { id };
		},
		onMutate: async (id: string) => {
			await queryClient.cancelQueries({ queryKey: qk.actionItems(project) });
			const prev = queryClient.getQueryData<any[]>(qk.actionItems(project));
			if (prev) {
				queryClient.setQueryData<any[]>(qk.actionItems(project), prev.filter((a: any) => a.id !== id));
			}
			return { prev };
		},
		onError: (_err: Error, _id: string, ctx: any) => {
			if (ctx?.prev) queryClient.setQueryData(qk.actionItems(project), ctx.prev);
		},
		onSettled: () => {
			// Use standard invalidation via refresh to ensure consistent analytics (without double event)
			handleRefresh();
		},
	});

	// Expose mutation loading state (currently unused UI-wise but prevents TS unused variable warning)
	// Touch mutation to avoid unused var error
	void dismissMutation.status;

		if (isLoading) {
		return (
			<Stack spacing={1} data-testid="action-items-skeleton">
				<Skeleton variant="text" width={180} height={32} />
				<Skeleton variant="rectangular" height={90} />
				<Skeleton variant="rectangular" height={90} />
				<Skeleton variant="rectangular" height={90} />
			</Stack>
		);
	}
		if (error) {
		const corr = (error as any)?.correlationId;
	return (
			<LiteInfoCard title={t('actionItems.error.title')}>
				<Stack spacing={2}>
					<Typography color="error">{t('actionItems.error.message')}</Typography>
					{corr && (
						<Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
							Correlation ID: {corr}
						</Typography>
					)}
			<Button variant="contained" size="small" onClick={handleRefresh} disabled={isFetching}>{t('actionItems.retry')}</Button>
				</Stack>
	</LiteInfoCard>
		);
	}

		const isEmpty = !data || data.length === 0;

	return (
			<Stack spacing={1} role="region" aria-labelledby="costscope-action-items-heading">
			<Stack direction="row" alignItems="center" justifyContent="space-between">
			<Typography id="costscope-action-items-heading" variant="h6" sx={{ mb: 0 }}>{t('actionItems.heading', { projectSuffix: project ? ` (${project})` : '' })}</Typography>
                <IconButton
					aria-label={t('actionItems.refresh.aria')}
					size="small"
					onClick={handleRefresh}
					disabled={fetching}
					sx={{ '&:focus-visible': { outline: '2px solid #1976d2', outlineOffset: 2 } }}
				>
					{fetching ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
				</IconButton>
			</Stack>
			  {isEmpty ? (
		  <LiteInfoCard title={t('actionItems.nodata.title')}>
			  <Typography>{t('actionItems.nodata.message')}</Typography>
		  </LiteInfoCard>
			) : (
	data!.map((item: any) => {
					const colorKey = colorMap[item.severity] || 'primary';
					const Icon = severityIconMap[item.severity] || InfoOutlinedIcon;
					return (
						<Card
							key={item.id}
							sx={{
								mb: 2,
								position: 'relative',
								pl: 0,
								'&:before': {
									content: '""',
									position: 'absolute',
									left: 0,
									top: 0,
									bottom: 0,
									width: 4,
									bgcolor: (theme) => theme.palette[colorKey].main,
									borderTopLeftRadius: '4px',
									borderBottomLeftRadius: '4px',
								},
							}}
							variant="outlined"
							aria-label={`Costscope alert (${item.severity}) ${item.message}`}
						>
							<CardHeader
								avatar={<Icon color={colorKey} fontSize="small" />}
								title={item.message}
								titleTypographyProps={{ color: colorKey }}
							/>
							<CardContent>
								{/* Minimal markdown: bold wrapper only, to avoid pulling markdown/highlight stacks */}
								<Typography component="span">
									Severity: <strong>{String(item.severity).toUpperCase()}</strong>
								</Typography>
								{/* Example optimistic action button (commented until real API exists)
								<Button size="small" onClick={() => dismissMutation.mutate(item.id)} disabled={dismissMutation.isLoading}>
									Dismiss
								</Button> */}
							</CardContent>
						</Card>
					);
				})
			)}
		</Stack>
	);
};

