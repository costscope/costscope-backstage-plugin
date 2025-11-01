import type { Meta, StoryObj } from '@storybook/react-webpack5';

import { ProvidersPanel } from './ProvidersPanel';

const meta: Meta<typeof ProvidersPanel> = {
  title: 'Costscope/ProvidersPanel',
  component: ProvidersPanel,
};
export default meta;

type Story = StoryObj<typeof ProvidersPanel>;

const providers = [
  { id: 'aws', name: 'Amazon Web Services', status: 'ok' },
  { id: 'azure', name: 'Microsoft Azure', status: 'degraded' },
  { id: 'gcp', name: 'Google Cloud', status: 'error' },
];

export const Default: Story = {
  parameters: { mockApi: { getProviders: async () => providers } },
};

export const Loading: Story = {
  parameters: { mockApi: { getProviders: async () => new Promise<any[]>(() => { /* never resolve */ }) } },
};

export const ErrorState: Story = {
  parameters: { mockApi: { getProviders: async () => { throw new Error('Network'); } } },
};

export const Empty: Story = {
  parameters: { mockApi: { getProviders: async () => [] } },
};
