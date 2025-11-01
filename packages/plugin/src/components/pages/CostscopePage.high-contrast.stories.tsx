import type { Meta, StoryObj } from '@storybook/react-webpack5';

import { CostscopePage } from './CostscopePage';

const meta: Meta<typeof CostscopePage> = {
  title: 'Costscope/Pages/CostscopePage (High Contrast)',
  component: CostscopePage,
  parameters: { highContrast: true },
};
export default meta;

type Story = StoryObj<typeof CostscopePage>;

export const Default: Story = {
  parameters: {
    // rely on storybook preview default mocks; highContrast provided via parameters
  },
};
