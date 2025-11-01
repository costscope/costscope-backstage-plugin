import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { within } from '@storybook/testing-library';

import {
  type Overview,
  type BreakdownRow,
  type ActionItem,
  type Summary,
  CostscopeErrorCodes,
} from '../../client';

import { CostscopePage } from './CostscopePage';

const meta: Meta<typeof CostscopePage> = {
  title: 'Costscope/Pages/CostscopePage',
  component: CostscopePage,
};
export default meta;

type Story = StoryObj<typeof CostscopePage>;

// Deterministic sample data for the dashboard stories
const overview: Overview[] = [
  { date: '2025-08-15', cost: 320.12 } as any,
  { date: '2025-08-16', cost: 318.05 } as any,
  { date: '2025-08-17', cost: 325.44 } as any,
  { date: '2025-08-18', cost: 333.91 } as any,
  { date: '2025-08-19', cost: 329.2 } as any,
  { date: '2025-08-20', cost: 341.77 } as any,
  { date: '2025-08-21', cost: 347.33 } as any,
];

const breakdown: BreakdownRow[] = [
  { dim: 'Compute', cost: 1234.56, deltaPct: 0.12 } as any,
  { dim: 'Database', cost: 987.65, deltaPct: -0.05 } as any,
  { dim: 'Storage', cost: 654.32, deltaPct: 0 } as any,
  { dim: 'Network', cost: 432.1, deltaPct: 0.08 } as any,
];

const alerts: ActionItem[] = [
  { id: 'a1', severity: 'warn', message: 'Unusual spike in Compute costs (12%)' } as any,
  { id: 'a2', severity: 'info', message: 'S3 Intelligent-Tiering could save ~5%' } as any,
];

const summary: Summary = {
  period: 'P7D',
  totalCost: 2310.73,
  prevPeriodCost: 2190.11,
  deltaPct: (2310.73 - 2190.11) / 2190.11,
  currency: 'USD',
} as any;

export const Default: Story = {
  parameters: {
    // Silent toasts intent: API is mocked so no client toasts are emitted
    mockApi: {
      getOverview: async () => overview,
      getBreakdown: async () => breakdown,
      getActionItems: async () => alerts,
      getSummary: async () => summary,
    },
  },
};

export const Loading: Story = {
  parameters: {
    mockApi: {
      getOverview: async () =>
        new Promise<Overview[]>(() => {
          /* never resolves */
        }),
      getBreakdown: async () =>
        new Promise<BreakdownRow[]>(() => {
          /* never resolves */
        }),
      getActionItems: async () =>
        new Promise<ActionItem[]>(() => {
          /* never resolves */
        }),
      getSummary: async () =>
        new Promise<Summary>(() => {
          /* never resolves */
        }),
    },
  },
};

export const ErrorState: Story = {
  parameters: {
    mockApi: {
      getOverview: async () => {
        throw new Error('Overview failed');
      },
      getBreakdown: async () => {
        throw new Error('Breakdown failed');
      },
      getActionItems: async () => {
        throw new Error('Alerts failed');
      },
      getSummary: async () => {
        throw new Error('Summary failed');
      },
    },
  },
};

export const Empty: Story = {
  parameters: {
    mockApi: {
      getOverview: async () => [],
      getBreakdown: async () => [],
      getActionItems: async () => [],
      getSummary: async () => ({ ...summary, totalCost: 0, prevPeriodCost: 0, deltaPct: 0 }) as any,
    },
  },
};

// Demonstrates the non-critical validation banner by simulating a runtime validation failure
// surfaced via the page-level prefetch hook. Widgets still render using deterministic data.
export const ValidationErrorBanner: Story = {
  parameters: {
    chromatic: {
      // Fix viewport to reduce responsive diffs and allow a short settle time
      viewports: [1200],
      delay: 300,
    },
    mockApi: {
      // Keep widgets working
      getOverview: async () => overview,
      getBreakdown: async () => breakdown,
      getActionItems: async () => alerts,
      getSummary: async () => summary,
      // Force the page-level prefetch to fail with a CostscopeError of type VALIDATION_ERROR
      prefetchAll: async () => {
        const err: any = {
          __costscope: true,
          name: 'CostscopeError',
          code: CostscopeErrorCodes.VALIDATION_ERROR,
          message: 'Schema validation failed for /costs/daily: ZodError: ...',
          attempt: 1,
          correlationId: 'storybook-corr-1234',
          schemaHash: 'deadbeef',
          path: '/costs/daily?period=P30D',
        };
        throw err;
      },
    },
  },
  // Ensure Chromatic snapshots after the banner is visible
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole('alert');
  },
};
