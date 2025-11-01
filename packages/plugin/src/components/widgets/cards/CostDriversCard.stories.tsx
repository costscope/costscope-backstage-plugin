import type { Meta, StoryObj } from '@storybook/react-webpack5';
import React from 'react';

import { CostDriversCard } from './CostDriversCard';

const meta: Meta<typeof CostDriversCard> = {
  title: 'Costscope/Widgets/CostDriversCard',
  component: CostDriversCard,
  parameters: {
    mockApi: {
      getBreakdown: async () => [
        { dim: 'Compute', cost: 1200, deltaPct: 0.12 },
        { dim: 'Storage', cost: 800, deltaPct: -0.05 },
        { dim: 'Network', cost: 500, deltaPct: 0.02 },
        { dim: 'Database', cost: 400, deltaPct: 0.08 },
        { dim: 'AI', cost: 300, deltaPct: 0.3 },
      ],
    },
  },
};

export default meta;
type Story = StoryObj<typeof CostDriversCard>;

export const Default: Story = {
  args: { period: 'P30D' },
};

export const Loading: Story = {
  parameters: {
    mockApi: {
      getBreakdown: async () => new Promise(() => {/* never resolves */}),
    },
  },
};

export const Empty: Story = {
  parameters: {
    mockApi: {
      getBreakdown: async () => [],
    },
  },
};

export const ErrorState: Story = {
  parameters: {
    mockApi: {
      getBreakdown: async () => { throw new Error('boom'); },
    },
  },
};
