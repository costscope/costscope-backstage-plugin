import type { Meta, StoryObj } from '@storybook/react-webpack5';

import { BreakdownRow } from '../../../client';

import { TopServices } from './TopServices';

const meta: Meta<typeof TopServices> = {
  title: 'Costscope/TopServices',
  component: TopServices,
};
export default meta;

type Story = StoryObj<typeof TopServices>;

const rows: BreakdownRow[] = [
  { dim: 'Compute', cost: 1234.56, deltaPct: 0.12 } as any,
  { dim: 'Database', cost: 987.65, deltaPct: -0.05 } as any,
  { dim: 'Storage', cost: 654.32, deltaPct: 0.0 } as any,
  { dim: 'Network', cost: 432.1, deltaPct: 0.08 } as any,
  { dim: 'Analytics', cost: 321.0, deltaPct: -0.03 } as any,
];

export const Default: Story = {
  parameters: {
    mockApi: { getBreakdown: async () => rows },
  },
};

export const Loading: Story = {
  parameters: {
    mockApi: { getBreakdown: async () => new Promise<BreakdownRow[]>(() => { /* never */ }) },
  },
};

export const ErrorState: Story = {
  parameters: {
    mockApi: { getBreakdown: async () => { throw new Error('Mock failure'); } },
  },
};

export const Empty: Story = {
  parameters: {
    mockApi: { getBreakdown: async () => [] },
  },
};

export const HighContrast: Story = {
  parameters: {
    highContrast: true,
    mockApi: { getBreakdown: async () => rows },
  },
};
