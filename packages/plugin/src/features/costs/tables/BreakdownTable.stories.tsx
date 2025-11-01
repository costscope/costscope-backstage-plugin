import type { Meta, StoryObj } from '@storybook/react-webpack5';

import { BreakdownRow } from '../../../client';

import { BreakdownTable } from './BreakdownTable';

const meta: Meta<typeof BreakdownTable> = {
  title: 'Costscope/BreakdownTable',
  component: BreakdownTable,
  args: { group: 'ServiceCategory' },
};
export default meta;

type Story = StoryObj<typeof BreakdownTable>;

const rows: BreakdownRow[] = [
  { dim: 'Compute', cost: 500, deltaPct: 0.05 },
  { dim: 'Storage', cost: 320, deltaPct: -0.02 },
  { dim: 'Network', cost: 210, deltaPct: 0.15 },
];

export const Default: Story = {
  parameters: {
    mockApi: { getBreakdown: async () => rows },
  },
};

export const Loading: Story = {
  parameters: {
    mockApi: { getBreakdown: async () => new Promise<BreakdownRow[]>(() => { /* hang */ }) },
  },
};

// Explicit Skeleton state alias, kept separate for clarity in docs panels
export const Skeleton: Story = {
  parameters: {
    mockApi: { getBreakdown: async () => new Promise<BreakdownRow[]>(() => { /* unresolved -> skeleton */ }) },
  },
};

export const ErrorState: Story = {
  parameters: {
    mockApi: { getBreakdown: async () => { throw new Error('Backend unavailable'); } },
  },
};

export const Empty: Story = {
  parameters: {
    mockApi: { getBreakdown: async () => [] },
  },
};

// Variant with feature flag 'costscope.breakdown.v2' enabled to show Effective Cost column
export const WithV2: Story = {
  parameters: {
    featureFlags: { 'costscope.breakdown.v2': true },
    mockApi: {
      getBreakdown: async () => [
        { dim: 'Compute', cost: 500, effectiveCost: 480 },
        { dim: 'Storage', cost: 320, effectiveCost: 325 },
        { dim: 'Network', cost: 210, effectiveCost: 205 },
      ] as any,
    },
  },
};

// High contrast theme variant
export const HighContrast: Story = {
  parameters: {
    highContrast: true,
    mockApi: { getBreakdown: async () => rows },
  },
};
