import type { Meta, StoryObj } from '@storybook/react-webpack5';

import { Overview } from '../../../client';

import { CostOverviewCard } from './CostOverviewCard';

const meta: Meta<typeof CostOverviewCard> = {
  title: 'Costscope/CostOverviewCard',
  component: CostOverviewCard,
};
export default meta;

type Story = StoryObj<typeof CostOverviewCard>;

const sample: Overview[] = Array.from({ length: 7 }).map((_, i) => ({
  date: `2025-08-${(i + 1).toString().padStart(2, '0')}`,
  cost: 100 + i * 17,
}));

export const Default: Story = {
  parameters: {
    mockApi: {
      getOverview: async () => sample,
    },
  },
};

export const Loading: Story = {
  parameters: {
    mockApi: {
      getOverview: async () => new Promise<Overview[]>(() => { /* never resolves to simulate loading */ }),
    },
  },
};

// Explicit Skeleton state (alias of Loading) to showcase skeleton visuals in Storybook docs
export const Skeleton: Story = {
  parameters: {
    mockApi: {
      getOverview: async () => new Promise<Overview[]>(() => { /* unresolved -> skeleton */ }),
    },
  },
};

export const ErrorState: Story = {
  parameters: {
    mockApi: {
      getOverview: async () => {
        throw new Error('Network failed');
      },
    },
  },
};

export const Empty: Story = {
  parameters: {
    mockApi: {
      getOverview: async () => [],
    },
  },
};

// High contrast theme variant
export const HighContrast: Story = {
  parameters: {
    highContrast: true,
    mockApi: {
      getOverview: async () => sample,
    },
  },
};
