import React from 'react';
import { CostOverviewCard } from './CostOverviewCard';
import { renderWithProviders } from 'src/testing/utils/renderWithProviders';
import { screen } from '@testing-library/react';

// Spy on downsampleAdaptive to count invocations triggered by width changes.
jest.mock('../../../utils/downsample', () => {
  const actual = jest.requireActual('../../../utils/downsample');
  return {
    ...actual,
    downsampleAdaptive: jest.fn(actual.downsampleAdaptive),
  };
});

jest.mock('@backstage/core-plugin-api', () => {
  const actual = jest.requireActual('@backstage/core-plugin-api');
  return {
    ...actual,
    useApi: (ref: any) => {
      if (ref?.id === 'plugin.costscope.service') return (globalThis as any).__COSTSCOPE_MOCK_API__;
      return {} as any;
    },
  };
});

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-mock="chart">{children}</div>,
  ComposedChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div />, Area: () => <div />, CartesianGrid: () => <div />, XAxis: () => <div />, YAxis: () => <div />, Tooltip: () => <div />, Legend: () => <div />,
}));

describe('CostOverviewCard resize throttle', () => {
  let originalRO: any;
  beforeEach(() => {
    originalRO = (globalThis as any).ResizeObserver;
    // Force fallback path (window resize listener) to simplify triggering events.
    (globalThis as any).ResizeObserver = undefined;
    jest.useFakeTimers();
    (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 16);
  });
  afterEach(() => {
    (globalThis as any).ResizeObserver = originalRO;
    jest.useRealTimers();
  const { downsampleAdaptive } = jest.requireMock('../../../utils/downsample');
    (downsampleAdaptive as jest.Mock).mockClear();
  });

  it('coalesces many rapid resize events into a single additional downsample computation', async () => {
    const points = Array.from({ length: 500 }, (_, i) => ({ date: `2025-08-${String((i % 30) + 1).padStart(2, '0')}`, cost: i + 1 }));
  const { downsampleAdaptive } = jest.requireMock('../../../utils/downsample');
    const { findByText } = renderWithProviders(<div style={{ width: 800 }}><CostOverviewCard /></div>, {
      mockApi: { getOverview: async () => points },
    });
    await findByText('30 Day Cost Overview');
    const baselineCalls = (downsampleAdaptive as jest.Mock).mock.calls.length;
    expect(baselineCalls).toBeGreaterThan(0);
    const region = await screen.findByRole('region');
    // Simulate rapid sequence of width changes before any animation frame flushes via window resize events
    let events = 0;
    for (let w = 800; w < 900; w += 5) {
      Object.defineProperty(region, 'clientWidth', { value: w, configurable: true });
      window.dispatchEvent(new Event('resize'));
      events++;
    }
    const preFlush = (downsampleAdaptive as jest.Mock).mock.calls.length;
    expect(preFlush).toBe(baselineCalls); // no recompute yet
    jest.runAllTimers();
    const postFlush = (downsampleAdaptive as jest.Mock).mock.calls.length;
    const delta = postFlush - baselineCalls;
    // Coalesced: should not equal number of events (would indicate unthrottled).
    expect(delta).toBeLessThan(events);
  });
});
