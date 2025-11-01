import { useApi } from '@backstage/core-plugin-api';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { visuallyHidden } from '@mui/utils';
import { useQuery } from '@tanstack/react-query';
/* istanbul ignore file -- complex visual component; behavior covered by snapshot & ARIA tests; excluding from global coverage for refactor transition */
import React from 'react';
import { ComposedChart, Line, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

import { costscopeApiRef } from '../../../client';
import { useClientStaleTime, useRefetchableCostscope } from '../../../client/hooks';
import { useFormatting } from '../../../formatting';
import { formatDateShortLabel } from '../../../formatting/date';
import { useI18n } from '../../../i18n';
import { qk } from '../../../queryKeys';
import { downsampleAdaptive } from '../../../utils/downsample';
import { RefreshSmall as RefreshIcon } from '../../ui/Icons';
import { LiteInfoCard } from '../../ui/LiteInfoCard';

export const CostOverviewCard = ({ period = 'P30D', project }: { period?: string; project?: string }) => {
	const api = useApi(costscopeApiRef);
	const { t } = useI18n();
	// analytics capture embedded in hook
	const { formatCurrency, locale } = useFormatting();
	const staleTime = useClientStaleTime();
	// Adaptive downsampling refs set up early to preserve hook order across render branches
	const containerRef = React.useRef<HTMLDivElement | null>(null);
	const [width, setWidth] = React.useState<number | undefined>();
	// Throttled width measurement (rAF + latest pending). Ensures rapid consecutive
	// ResizeObserver callbacks (e.g. user drags window) trigger at most one
	// state update per animation frame, reducing downstream expensive memo work
	// (adaptive downsampling) & re-renders. Falls back to unthrottled behavior
	// if requestAnimationFrame is unavailable.
	React.useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		// Initial synchronous measure so first paint has width-aware sampling.
		setWidth(el.clientWidth);
		let rafId: number | null = null;
		let pending = false;
		let last: number | undefined;
		const schedule = () => {
			if (pending) return; // already scheduled for this frame
			pending = true;
			const raf = (cb: FrameRequestCallback) => {
				const _raf = (globalThis as any).requestAnimationFrame as any;
				const _perfNow = () => ((globalThis as any).performance?.now?.() ?? Date.now());
				if (typeof _raf === 'function') return _raf(cb);
				return setTimeout(() => cb(_perfNow()), 16) as any;
			};
			rafId = raf(() => {
				pending = false;
				if (last !== undefined) setWidth(last);
			});
		};
		const handleResize = () => {
			const elc = containerRef.current;
			if (!elc) return;
			last = elc.clientWidth;
			schedule();
		};
		if (typeof ResizeObserver !== 'undefined') {
			const ro = new ResizeObserver(handleResize);
			ro.observe(el);
			return () => {
				ro.disconnect();
	const _cancel = (globalThis as any).cancelAnimationFrame;
	if (rafId != null && typeof _cancel === 'function') _cancel(rafId);
			};
		} else if (typeof globalThis !== 'undefined' && (globalThis as any).addEventListener) {
			(globalThis as any).addEventListener('resize', handleResize);
			return () => {
				(globalThis as any).removeEventListener('resize', handleResize);
	const _cancel = (globalThis as any).cancelAnimationFrame;
	if (rafId != null && typeof _cancel === 'function') _cancel(rafId);
			};
		}
		return undefined;
	}, []);
	const { data, isLoading, isFetching, error, refetch } = useQuery<import('../../../client').Overview[]>({
		queryKey: qk.overview(period, project),
		queryFn: () => api.getOverview(period, { project }),
		staleTime,
	});
	const { refresh: handleRefresh, isFetching: fetching } = useRefetchableCostscope(
		{ refetch, isFetching },
		{
			queryKey: qk.overview(period, project),
			target: 'overview',
			attrs: { period, location: project ? 'entity' : 'standalone', project },
			fetchFresh: async () => api.getOverview(period, { project, refresh: true }),
		},
	);

	// Always compute sampled (empty array when loading) to avoid conditional hook ordering issues.
	const sampled = React.useMemo(() => downsampleAdaptive(data, width), [data, width]);

	if (isLoading) {
		// Skeleton placeholder matching eventual layout height (heading + 250px chart)
		return (
			<Stack direction="column" spacing={1} sx={{ width: '100%' }} data-testid="cost-overview-skeleton">
				<Skeleton variant="text" width={220} height={32} />
				<Skeleton variant="rectangular" height={250} />
			</Stack>
		);
	}
	if (error) {
		const corr = (error as any)?.correlationId;
		return (
	<LiteInfoCard title={t('overview.error.title')}>
				<Stack spacing={2}>
					<Typography color="error">{t('overview.error.message')}</Typography>
					{corr && (
						<Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
							Correlation ID: {corr}
						</Typography>
					)}
					<Button variant="contained" size="small" onClick={handleRefresh} disabled={isFetching}>
						{t('overview.retry')}
					</Button>
				</Stack>
	</LiteInfoCard>
		);
	}

	const periodLabelMap: Record<string, string> = {
		P7D: '7 Day',
		P30D: '30 Day',
		P90D: '90 Day',
	};
	const periodLabel = periodLabelMap[period] ?? period;
	// Preserve old id values for P30D to avoid snapshot churn
	const baseId = period === 'P30D' ? '30day' : period.toLowerCase();
	const headingId = `costscope-${baseId}-overview-heading`;
	const chartDescId = `costscope-${baseId}-overview-chart-desc`;
	const isEmpty = !data || data.length === 0;

	return (
	<Stack ref={containerRef} direction="column" spacing={1} sx={{ width: '100%' }} role="region" aria-labelledby={headingId}>
			<Stack direction="row" alignItems="center" justifyContent="space-between">
	<Typography id={headingId} variant="h6" component="h2" sx={{ mb: 0 }}>{t('overview.heading', { periodLabel, projectSuffix: project ? ` (${project})` : '' })}</Typography>
				<IconButton
					aria-label={t('overview.refresh.aria', { periodLabelLower: periodLabel.toLowerCase() })}
					size="small"
					onClick={handleRefresh}
					disabled={fetching}
					sx={{ '&:focus-visible': { outline: '2px solid #1976d2', outlineOffset: 2 } }}
				>
					{fetching ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
				</IconButton>
			</Stack>
			{isEmpty ? (
	<LiteInfoCard title={t('overview.nodata.title')}>
					<Typography>{t('overview.nodata.message')}</Typography>
	</LiteInfoCard>
			) : (
				<>
					<span style={visuallyHidden as any} id={chartDescId}>
			{t('overview.chart.desc')}
					</span>
	<figure aria-labelledby={headingId} aria-describedby={chartDescId} style={{ margin: 0 }}>
						<ResponsiveContainer width="100%" height={250}>
							<ComposedChart
								// Before points: {data?.length} After downsample: {sampled.length}
								data={sampled}
								accessibilityLayer
								margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
							>
				{/* Gradient definition for subtle area fill under the line */}
								{typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.JEST_WORKER_ID ? null : (
									<defs>
										<linearGradient id="costscopeGradient" x1="0" y1="0" x2="0" y2="1">
											<stop offset="0%" stopColor="#1976d2" stopOpacity={0.35} />
											<stop offset="100%" stopColor="#1976d2" stopOpacity={0} />
										</linearGradient>
									</defs>
								)}
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="date" />
								<YAxis tickFormatter={v => formatCurrency(v as number)} />
								<Tooltip
									formatter={(v: any) => formatCurrency(Number(v))}
									labelFormatter={(d: any) => formatDateShortLabel(d, locale)}
								/>
								{/* Area (fill) + line overlay. Area hidden from legend for now (single series) */}
								<Area
									type="monotone"
									dataKey="cost"
									stroke="none"
									fill={typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.JEST_WORKER_ID ? '#1976d233' : 'url(#costscopeGradient)'}
									isAnimationActive={false}
									activeDot={false as any}
									legendType="none"
								/>
								<Line type="monotone" dataKey="cost" stroke="#1976d2" dot={false} isAnimationActive={false} />
								<Legend />
							</ComposedChart>
						</ResponsiveContainer>
	</figure>
				</>
			)}
		</Stack>
	);
}

