import type { Meta, StoryObj } from '@storybook/react-webpack5';

import { ActionItem } from '../../../client';

import { ActionItemsPanel } from './ActionItemsPanel';

const meta: Meta<typeof ActionItemsPanel> = {
  title: 'Costscope/ActionItemsPanel',
  component: ActionItemsPanel,
};
export default meta;

type Story = StoryObj<typeof ActionItemsPanel>;

const items: ActionItem[] = [
  { id: '1', severity: 'critical', message: 'Spend anomaly detected in Compute (+35%)' },
  { id: '2', severity: 'warn', message: 'Idle RDS instance running > 7 days' },
  { id: '3', severity: 'info', message: 'Consider committed use discounts for sustained usage' },
];

export const Default: Story = {
  parameters: { mockApi: { getActionItems: async () => items } },
};

export const Loading: Story = {
  parameters: { mockApi: { getActionItems: async () => new Promise<ActionItem[]>(() => { /* hang */ }) } },
};

export const ErrorState: Story = {
  parameters: { mockApi: { getActionItems: async () => { throw new Error('Timeout contacting API'); } } },
};

export const Empty: Story = {
  parameters: { mockApi: { getActionItems: async () => [] } },
};

// High contrast theme variant
export const HighContrast: Story = {
  parameters: {
    highContrast: true,
    mockApi: { getActionItems: async () => items },
  },
};
