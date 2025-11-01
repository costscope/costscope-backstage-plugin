import type { Meta, StoryObj } from '@storybook/react-webpack5';
import React from 'react';

import { ChargeCategoryDonut } from './ChargeCategoryDonut';

const meta: Meta<typeof ChargeCategoryDonut> = {
  title: 'Widgets/Charts/ChargeCategoryDonut',
  component: ChargeCategoryDonut,
};
export default meta;
type Story = StoryObj<typeof ChargeCategoryDonut>;

const sample = [
  { dim: 'Compute', cost: 1200, deltaPct: 0.12 },
  { dim: 'Storage', cost: 800, deltaPct: -0.05 },
  { dim: 'Network', cost: 500, deltaPct: 0.03 },
  { dim: 'Support', cost: 300, deltaPct: 0.0 },
  { dim: 'Other', cost: 200, deltaPct: 0.01 },
];

export const Default: Story = {
  parameters: {
    mockApi: {
      getBreakdown: async (group: string) => (group === 'ChargeCategory' ? sample : []),
    },
  },
};

export const Loading: Story = {
  parameters: {
    mockApi: {
      getBreakdown: async () => new Promise(() => {}),
    },
  },
};

export const ErrorState: Story = {
  parameters: {
    mockApi: {
      getBreakdown: async () => {
        throw new Error('Failed');
      },
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
