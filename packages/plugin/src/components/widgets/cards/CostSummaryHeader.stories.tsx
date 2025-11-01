import type { Meta, StoryObj } from '@storybook/react-webpack5';
import React from 'react';

import { CostSummaryHeader } from './CostSummaryHeader';

const meta: Meta<typeof CostSummaryHeader> = {
  title: 'Costscope/Widgets/CostSummaryHeader',
  component: CostSummaryHeader,
  parameters: {
    mockApi: {
      getSummary: async () => ({ period: 'P30D', project: 'global', totalCost: 1234.56, previousTotalCost: 1000, prevPeriodCost: 1000, deltaPct: 0.234, avgDailyCost: 41.15, currency: 'USD' }),
      getBreakdown: async () => [
        { dim: 'Compute', cost: 500, deltaPct: 0.2 },
        { dim: 'Storage', cost: 300, deltaPct: 0.1 },
        { dim: 'Network', cost: 250, deltaPct: -0.05 },
        { dim: 'Other', cost: 184.56, deltaPct: 0 },
      ],
    },
  },
};
export default meta;

type Story = StoryObj<typeof CostSummaryHeader>;

export const Default: Story = { args: { period: 'P30D' } };

export const Loading: Story = {
  parameters: {
    mockApi: {
      getSummary: async () => new Promise(() => {}),
      getBreakdown: async () => new Promise(() => {}),
    },
  },
};

export const ErrorState: Story = {
  parameters: {
    mockApi: {
      getSummary: async () => { throw new Error('boom'); },
      getBreakdown: async () => [],
    },
  },
};

export const Empty: Story = {
  parameters: {
    mockApi: {
      getSummary: async () => ({ period: 'P30D', project: 'global', totalCost: 0, previousTotalCost: 0, prevPeriodCost: 0, deltaPct: 0, avgDailyCost: 0, currency: 'USD' }),
      getBreakdown: async () => [],
    },
  },
};
