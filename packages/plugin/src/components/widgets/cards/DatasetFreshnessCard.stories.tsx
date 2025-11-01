import type { Meta, StoryObj } from '@storybook/react-webpack5';

import { DatasetFreshnessCard } from './DatasetFreshnessCard';

const meta: Meta<typeof DatasetFreshnessCard> = {
  title: 'Costscope/DatasetFreshnessCard',
  component: DatasetFreshnessCard,
};
export default meta;

type Story = StoryObj<typeof DatasetFreshnessCard>;

const rows = [
  { id: 'ds1', provider: 'aws', periodStart: '2025-07-01', periodEnd: '2025-07-31', records: 120000, status: 'ready' },
  { id: 'ds2', provider: 'azure', periodStart: '2025-07-01', periodEnd: '2025-07-31', records: 90000, status: 'ready' },
];

export const Default: Story = {
  parameters: { mockApi: { getDatasets: async () => rows } },
  args: { limit: 5 },
};

export const Loading: Story = {
  parameters: { mockApi: { getDatasets: async () => new Promise<any[]>(() => { /* never resolve */ }) } },
  args: {},
};

export const ErrorState: Story = {
  parameters: { mockApi: { getDatasets: async () => { throw new Error('Network'); } } },
  args: {},
};

export const Empty: Story = {
  parameters: { mockApi: { getDatasets: async () => [] } },
  args: {},
};
