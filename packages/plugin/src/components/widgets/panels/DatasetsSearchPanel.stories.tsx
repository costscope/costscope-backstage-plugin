import type { Meta, StoryObj } from '@storybook/react-webpack5';

import { DatasetsSearchPanel } from './DatasetsSearchPanel';

const meta: Meta<typeof DatasetsSearchPanel> = {
  title: 'Costscope/DatasetsSearchPanel',
  component: DatasetsSearchPanel,
};
export default meta;

type Story = StoryObj<typeof DatasetsSearchPanel>;

const datasets = [
  { id: 'ds1', provider: 'aws', periodStart: '2025-07-01', periodEnd: '2025-07-31', records: 120000, status: 'ready' },
  { id: 'ds2', provider: 'azure', periodStart: '2025-07-01', periodEnd: '2025-07-31', records: 90000, status: 'ready' },
];

export const Default: Story = {
  parameters: { mockApi: { searchDatasets: async () => datasets } },
  args: {},
};

export const FiltersApplied: Story = {
  parameters: { mockApi: { searchDatasets: async () => datasets.filter(d => d.provider === 'aws') } },
  args: { provider: 'aws', status: 'ready', limit: 10 },
};

export const Loading: Story = {
  parameters: { mockApi: { searchDatasets: async () => new Promise<any[]>(() => { /* hang */ }) } },
  args: {},
};

export const ErrorState: Story = {
  parameters: { mockApi: { searchDatasets: async () => { throw new Error('Timeout'); } } },
  args: {},
};

export const Empty: Story = {
  parameters: { mockApi: { searchDatasets: async () => [] } },
  args: {},
};
